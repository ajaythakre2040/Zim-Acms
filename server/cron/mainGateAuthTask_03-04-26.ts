import { db, mssqlPool } from "../db";
import {
    devices,
    doorDevices,
    people,
    roles,
    cronMaster,
    doors,
    cabinLockouts,
} from "@shared/schema";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import {
    ACCESS_RULES,
    ZONES,
    MAIN_GATE_SYNC,
    CABIN_LOCKOUT_CONFIG,
} from "../constant";
import * as helpers from "./cronHelpers";

export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const indianTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
    });
    console.log(
        `\n=============================================================`,
    );
    console.log(`>>>>> [START] CRON EXECUTION: ${indianTime} <<<<<`);
    console.log(`=============================================================`);

    try {
        // 1. CRON STATE & RECOVERY
        const [cronState] = await db
            .select()
            .from(cronMaster)
            .where(eq(cronMaster.code, CRON_CODE))
            .limit(1);

        if (!cronState || !cronState.isActive) {
            console.log("[-] ABORTED: Cron is marked INACTIVE.");
            return;
        }

        if (cronState.isRunning) {
            const lastRun = cronState.lastRun
                ? new Date(cronState.lastRun).getTime()
                : 0;
            const diffInMins = (new Date().getTime() - lastRun) / 60000;
            if (diffInMins < 5) {
                console.log("[-] SKIP: Cron already running.");
                return;
            }
        }

        await db
            .update(cronMaster)
            .set({ isRunning: true, lastRun: sql`NOW()` })
            .where(eq(cronMaster.code, CRON_CODE));

        // 2. FETCH MASTER DATA
        const [allDoorDevices, allDevices, allPeople, allRoles, allDoors] =
            await Promise.all([
                db.select().from(doorDevices),
                db.select().from(devices).where(gt(devices.msId, 0)),
                db.select().from(people),
                db.select().from(roles),
                db.select().from(doors),
            ]);

        const mainGateDoor = allDoors.find((d) => d.code === CRON_CODE);
        if (!mainGateDoor)
            throw new Error(`CRITICAL: Main Gate Configuration missing.`);

        // 3. FETCH PUNCHES
        let lastId = Number(cronState.lastProcessedId || 0);
        const result = await mssqlPool.request().query(`
            SELECT EmployeeCode, DeviceId, DeviceLogId, LogDate 
            FROM DeviceLogs WHERE DeviceLogId > ${lastId} ORDER BY DeviceLogId ASC
        `);

        const punches = result.recordset || [];
        let maxId = lastId;

        // 4. PROCESS EACH PUNCH
        for (const punch of punches) {
            const empCodeRaw = (punch.EmployeeCode || "").toString().trim();
            if (!empCodeRaw) continue;

            const punchDeviceId = Number(punch.DeviceId);
            const punchTime = new Date(punch.LogDate);
            const currentLogId = Number(punch.DeviceLogId);

            console.log(`\n--- [PUNCH] ID: ${currentLogId} | Emp: ${empCodeRaw} ---`);

            const doorMapping = allDoorDevices.find((d) =>
                [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])].includes(
                    punchDeviceId,
                ),
            );
            const doorDetails = allDoors.find((d) => d.id === doorMapping?.doorId);
            const emp = allPeople.find(
                (p) => p.employeeCode?.toString().trim() === empCodeRaw,
            );

            if (!emp || !doorDetails) {
                maxId = currentLogId;
                continue;
            }

            const isMainGatePunch = doorDetails.code === CRON_CODE;
            const isEntryPunch = (doorMapping!.inDeviceIds || []).includes(
                punchDeviceId,
            );
            const role = allRoles.find((r) => r.id === emp.roleId);

            let allowedDoorIds: number[] = [];
            if (role?.doorIds) {
                try {
                    allowedDoorIds = Array.isArray(role.doorIds)
                        ? role.doorIds.map(Number)
                        : JSON.parse(role.doorIds as string).map(Number);
                } catch (e) {
                    console.log("Role parse error");
                }
            }

            let ruleToApply = emp.ruleid;
            let currentZone = emp.currentZone;
            let blockAllInternal = true;
            let actionMsg = "";

            // --- RULE ENGINE (Old Logic Maintained + Cabin Isolation Added) ---
            if (isMainGatePunch) {
                if (isEntryPunch) {
                    const activeLockout = await helpers.getLockoutStatus(empCodeRaw);
                    if (!helpers.hasValidRole(emp)) {
                        ruleToApply = ACCESS_RULES.NO_ROLE;
                        blockAllInternal = true;
                        actionMsg = "REJECTED (No Role)";
                    } else if (activeLockout) {
                        ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE;
                        blockAllInternal = true;
                        actionMsg = "REJECTED (Lockout)";
                    } else {
                        ruleToApply = ACCESS_RULES.MAIN_GATE_IN;
                        currentZone = ZONES.IN;
                        blockAllInternal = false;
                        actionMsg = "MAIN GATE ENTRY";
                    }
                } else {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT;
                    currentZone = ZONES.OUT;
                    blockAllInternal = true;
                    actionMsg = "MAIN GATE EXIT";
                }
            } else {
                if (!helpers.hasEnteredToday(emp, todayStart)) {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT;
                    currentZone = ZONES.OUT;
                    blockAllInternal = true;
                    actionMsg = "SECURITY BLOCK";
                } else {
                    if (isEntryPunch) {
                        // CABIN IN: Isolate to this door
                        ruleToApply = ACCESS_RULES.CABIN_IN;
                        currentZone = ZONES.CABIN;
                        blockAllInternal = true;
                        actionMsg = `CABIN ENTRY: ${doorDetails.name}`;
                    } else {
                        // CABIN OUT
                        if (doorDetails.is_lockout_enabled) {
                            ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE;
                            currentZone = ZONES.IN;
                            blockAllInternal = true;
                            actionMsg = "CABIN EXIT (Lockout)";
                            // const [lockout_time] = await db.select().from(cronMaster).where(eq(cronMaster.code, CABIN_LOCKOUT_CONFIG.CODE)).limit(1);
                            // await db.insert(cabinLockouts).values({
                            //     employeeCode: empCodeRaw, doorId: doorDetails.id, outPunchTime: punchTime,
                            //     lockoutExpiry: new Date(punchTime.getTime() + (lockout_time.lockoutHours || 2) * 3600000),
                            //     status: "active"
                            // });
                            const [lockoutConfig] = await db
                                .select()
                                .from(cronMaster)
                                .where(eq(cronMaster.code, CABIN_LOCKOUT_CONFIG.CODE)) // Aapka current config code
                                .limit(1);

                            // 2. Default values set karo agar DB mein null ho
                            const hours = lockoutConfig?.lockoutHours || 0; // Maan lo 1
                            const minutes = lockoutConfig?.lockoutMinutes || 30; // Maan lo 30

                            // 3. Milliseconds calculate karo
                            // 1 Hour = 3,600,000 ms | 1 Minute = 60,000 ms
                            const totalLockoutMs = hours * 3600000 + minutes * 60000;

                            // 4. Insert karo new Expiry time ke saath
                            await db.insert(cabinLockouts).values({
                                employeeCode: empCodeRaw,
                                doorId: doorDetails.id,
                                outPunchTime: punchTime,
                                // Punch time + calculated hours & minutes
                                lockoutExpiry: new Date(punchTime.getTime() + totalLockoutMs),
                                status: "active",
                            });
                        } else {
                            ruleToApply = ACCESS_RULES.CABIN_OUT;
                            currentZone = ZONES.IN;
                            blockAllInternal = false;
                            actionMsg = "CABIN EXIT (Access Restored)";
                        }
                    }
                }
            }
            console.log(`    [LOGIC] ${actionMsg}`);

            // --- 5. UPDATED HARDWARE SYNC ---
            for (const machine of allDevices) {
                const mMapping = allDoorDevices.find(
                    (dd) =>
                        (dd.inDeviceIds || []).includes(machine.msId!) ||
                        (dd.outDeviceIds || []).includes(machine.msId!),
                );
                const machineDoorId = mMapping?.doorId;
                const isThisMachineMainGate = machineDoorId === mainGateDoor.id;

                let shouldBlock = true;

                // Case 1: Employee is in a CABIN (Isolation mode - Only this cabin door open)
                if (currentZone === ZONES.CABIN) {
                    shouldBlock = machineDoorId !== doorDetails.id;
                }
                // Case 2: Employee is in Premises (Normal IN Zone)
                else if (currentZone === ZONES.IN && !blockAllInternal) {
                    if (isThisMachineMainGate) {
                        shouldBlock = false;
                    } else if (machineDoorId) {
                        const isAllowed = allowedDoorIds.includes(Number(machineDoorId));
                        shouldBlock = !isAllowed;
                    }
                }
                // Case 3: CABIN EXIT / LOCKOUT / MAIN GATE OUT
                else {
                    // FIX: Agar banda Lockout mein hai (CABIN OUT punch ke baad), 
                    // toh use Main Gate allow karo taaki wo bahar ja sake, 
                    // par baaki saare internal doors block rakho.
                    if (ruleToApply === ACCESS_RULES.LOCKOUT_ACTIVE && isThisMachineMainGate) {
                        shouldBlock = false;
                    } else {
                        shouldBlock = true;
                    }
                }

                // Global Safety: Punch ke waqt usi machine ko block command nahi bhejni
                if (isMainGatePunch && isThisMachineMainGate) shouldBlock = false;

                await helpers.updateDeviceStatus(empCodeRaw, machine, shouldBlock);
            }
            // --- 6. DB UPDATE ---
            await db
                .update(people)
                .set({
                    lastSeenTime: punchTime,
                    ruleid: ruleToApply,
                    currentZone: currentZone,
                    lastPunchDoorId: doorDetails.id,
                    updatedAt: sql`NOW()`,
                })
                .where(eq(people.employeeCode, empCodeRaw));

            maxId = currentLogId;
            await db
                .update(cronMaster)
                .set({ lastProcessedId: maxId })
                .where(eq(cronMaster.code, CRON_CODE));
        }

        // --- 7. EXPIRED LOCKOUTS CLEANUP (Scenario A & B Recovery) ---
        const expired = await db
            .update(cabinLockouts)
            .set({ status: "expired" })
            .where(
                and(
                    eq(cabinLockouts.status, "active"),
                    lt(cabinLockouts.lockoutExpiry, new Date()),
                ),
            )
            .returning();

        if (expired.length > 0) {
            for (const rec of expired) {
                if (!rec.employeeCode) continue;

                // RE-FETCH: Fresh data le rahe hain taaki agar isi cycle mein zone change hua ho toh pata chale
                const [freshEmp] = await db.select().from(people).where(eq(people.employeeCode, rec.employeeCode)).limit(1);
                if (!freshEmp) continue;

                const r = allRoles.find((x) => x.id === freshEmp.roleId);
                let allowed: number[] = [];
                if (r?.doorIds) {
                    allowed = Array.isArray(r.doorIds)
                        ? r.doorIds.map(Number)
                        : JSON.parse(r.doorIds as string).map(Number);
                }

                // Scenario A Logic: Agar banda abhi bhi building ke andar hai, toh DB update karo
                if (freshEmp.currentZone !== ZONES.OUT) {
                    await db.update(people)
                        .set({
                            currentZone: ZONES.IN,
                            ruleid: ACCESS_RULES.MAIN_GATE_IN,
                            updatedAt: sql`NOW()`
                        })
                        .where(eq(people.employeeCode, rec.employeeCode));

                    console.log(`[CLEANUP] Access Restored (In-Premises) for: ${rec.employeeCode}`);
                }

                // Hardware Restore Logic
                for (const m of allDevices) {
                    const mDM = allDoorDevices.find((dd) =>
                        (dd.inDeviceIds || []).includes(m.msId!) || (dd.outDeviceIds || []).includes(m.msId!)
                    );

                    const isMainGate = mDM?.doorId === mainGateDoor.id;
                    const isAllowed = allowed.includes(Number(mDM?.doorId || 0)) || isMainGate;

                    // Final Check: Agar banda bahar ja chuka hai, toh sirf Main Gate open rakho.
                    // Agar building ke andar hai, toh uske role ke hisaab se doors kholo.
                    const shouldBlock = (freshEmp.currentZone === ZONES.OUT) ? !isMainGate : !isAllowed;

                    await helpers.updateDeviceStatus(rec.employeeCode, m, shouldBlock);
                }
            }
        }
        await db
            .update(cronMaster)
            .set({ isRunning: false, lastStatus: "success" })
            .where(eq(cronMaster.code, CRON_CODE));
    } catch (e) {
        console.error("CRON ERROR:", e);
        await db
            .update(cronMaster)
            .set({ isRunning: false, lastStatus: "failed", lastMessage: String(e) })
            .where(eq(cronMaster.code, CRON_CODE));
    }
}
