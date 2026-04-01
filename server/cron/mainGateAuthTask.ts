import { db, mssqlPool } from "../db";
import {
    devices,
    doorDevices,
    people,
    roles,
    cronMaster,
    doors,
    cabinLockouts
} from "@shared/schema";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { ACCESS_RULES, ZONES, MAIN_GATE_SYNC } from "../constant";
import * as helpers from "./cronHelpers";

export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const indianTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log(`\n=============================================================`);
    console.log(`>>>>> [START] CRON EXECUTION: ${indianTime} <<<<<`);
    console.log(`=============================================================`);

    try {
        // 1. CRON STATE & RECOVERY
        console.log("[+] STEP 1: Checking Cron State...");
        const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, CRON_CODE)).limit(1);

        if (!cronState || !cronState.isActive) {
            console.log("[-] ABORTED: Cron is marked INACTIVE in Database.");
            return;
        }

        if (cronState.isRunning) {
            const lastRun = cronState.lastRun ? new Date(cronState.lastRun).getTime() : 0;
            const diffInMins = (new Date().getTime() - lastRun) / 60000;

            if (diffInMins > 5) {
                console.warn(`[!] RECOVERY: Cron was stuck for ${Math.round(diffInMins)}m. Resetting status...`);
            } else {
                console.log("[-] SKIP: Cron already running (Wait for next cycle).");
                return;
            }
        }

        // Mark as Running immediately
        await db.update(cronMaster).set({ isRunning: true, lastRun: sql`NOW()` }).where(eq(cronMaster.code, CRON_CODE));

        // 2. FETCH MASTER DATA (Parallel for Speed)
        console.log("[+] STEP 2: Loading Master Data (People, Roles, Devices, Doors)...");
        const [allDoorDevices, allDevices, allPeople, allRoles, allDoors] = await Promise.all([
            db.select().from(doorDevices),
            db.select().from(devices).where(gt(devices.msId, 0)),
            db.select().from(people),
            db.select().from(roles),
            db.select().from(doors)
        ]);
        console.log(`    -> Total Records: ${allPeople.length} People | ${allDevices.length} Devices | ${allRoles.length} Roles.`);

        const mainGateDoor = allDoors.find(d => d.code === CRON_CODE);
        const mainGateConfig = allDoorDevices.find(dd => dd.doorId === mainGateDoor?.id);

        if (!mainGateConfig || !mainGateDoor) {
            throw new Error(`CRITICAL: Main Gate Configuration (${CRON_CODE}) missing in database.`);
        }

        const gateDeviceIds = [...(mainGateConfig.inDeviceIds || []), ...(mainGateConfig.outDeviceIds || [])];
        const internalDevices = allDevices.filter(d => !gateDeviceIds.includes(d.msId!));
        console.log(`    -> Main Gate Devices: [${gateDeviceIds.join(", ")}]`);
        console.log(`    -> Internal Devices to Sync: ${internalDevices.length}`);

        // 3. FETCH PUNCHES FROM MS-SQL (ESSL)
        let lastId = Number(cronState.lastProcessedId || 0);
        console.log(`[+] STEP 3: Fetching new logs from MS-SQL starting from ID: ${lastId}...`);

        const result = await mssqlPool.request().query(`
            SELECT EmployeeCode, DeviceId, DeviceLogId, LogDate 
            FROM DeviceLogs WHERE DeviceLogId > ${lastId} ORDER BY DeviceLogId ASC
        `);

        const punches = result.recordset || [];
        console.log(`    -> Found ${punches.length} new punch(es).`);

        let maxId = lastId;

        // 4. PROCESS EACH PUNCH SEQUENTIALLY (Ensures DB Integrity)
        for (const punch of punches) {
            const empCodeRaw = (punch.EmployeeCode || "").toString().trim();
            if (!empCodeRaw) continue;

            const punchDeviceId = Number(punch.DeviceId);
            const punchTime = new Date(punch.LogDate);
            const currentLogId = Number(punch.DeviceLogId);

            console.log(`\n--- [PUNCH PROCESSING] ID: ${currentLogId} | Emp: ${empCodeRaw} ---`);

            const doorMapping = allDoorDevices.find(d => [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])].includes(punchDeviceId));
            const doorDetails = allDoors.find(d => d.id === doorMapping?.doorId);
            // Strict check: Case insensitive and Trimmed
            const emp = allPeople.find(p => p.employeeCode?.toString().trim() === empCodeRaw);

            if (!emp) {
                console.log(`    [❌ SKIP] Employee Code "${empCodeRaw}" not found in PG People table.`);
                maxId = currentLogId; continue;
            }
            if (!doorMapping || !doorDetails) {
                console.log(`    [❌ SKIP] Device ${punchDeviceId} is not mapped to any Door.`);
                maxId = currentLogId; continue;
            }

            console.log(`    [INFO] Door: ${doorDetails.name} | Zone: ${emp.currentZone}`);

            const isMainGatePunch = doorDetails.code === CRON_CODE;
            const isEntryPunch = (doorMapping.inDeviceIds || []).includes(punchDeviceId);
            const role = allRoles.find(r => r.id === emp.roleId);

            // Role Parsing (Handling Array or JSON String)
            let allowedDoorIds: number[] = [];
            if (role && role.doorIds) {
                try {
                    allowedDoorIds = Array.isArray(role.doorIds)
                        ? role.doorIds.map(Number)
                        : JSON.parse(role.doorIds as string).map(Number);
                } catch (e) { console.log(`    [!] ROLE ERROR: Could not parse doorIds for ${empCodeRaw}`); }
            }
            console.log(`    [ROLE] ${role?.name || 'No Role'} | Allowed Doors: [${allowedDoorIds.join(", ")}]`);

            let ruleToApply = emp.ruleid;
            let currentZone = emp.currentZone;
            let blockAllInternal = true;
            let actionMsg = "";

            // --- THE RULE ENGINE ---
            if (isMainGatePunch) {
                if (isEntryPunch) {
                    const activeLockout = await helpers.getLockoutStatus(empCodeRaw);
                    if (!helpers.hasValidRole(emp)) {
                        ruleToApply = ACCESS_RULES.NO_ROLE; blockAllInternal = true; actionMsg = "REJECTED (No Valid Role)";
                    } else if (activeLockout) {
                        ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE; blockAllInternal = true; actionMsg = "REJECTED (Active Lockout)";
                    } else {
                        ruleToApply = ACCESS_RULES.MAIN_GATE_IN; currentZone = ZONES.IN; blockAllInternal = false; actionMsg = "ACCEPTED (Main Gate In)";
                    }
                } else {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT; currentZone = ZONES.OUT; blockAllInternal = true; actionMsg = "EXIT (Main Gate Out)";
                }
            } else {
                // Internal Doors Logic
                if (!helpers.hasEnteredToday(emp, todayStart)) {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT; currentZone = ZONES.OUT; blockAllInternal = true; actionMsg = "SECURITY BLOCK (No Entry Today)";
                } else {
                    if (isEntryPunch) {
                        ruleToApply = ACCESS_RULES.CABIN_IN; currentZone = ZONES.CABIN; blockAllInternal = true; actionMsg = "CABIN ENTRY (Internal Doors Blocked)";
                    } else {
                        if (doorDetails.is_lockout_enabled) {
                            ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE; blockAllInternal = true; actionMsg = "CABIN EXIT (Lockout Timer Start)";
                            await db.insert(cabinLockouts).values({
                                employeeCode: empCodeRaw, doorId: doorDetails.id, outPunchTime: punchTime,
                                lockoutExpiry: new Date(punchTime.getTime() + (cronState.lockoutHours || 2) * 3600000),
                                status: "active"
                            });
                        } else {
                            ruleToApply = ACCESS_RULES.CABIN_OUT; currentZone = ZONES.IN; blockAllInternal = false; actionMsg = "CABIN EXIT (Access Restored)";
                        }
                    }
                }
            }
            console.log(`    [LOGIC] Action: ${actionMsg}`);

            // --- 5. HARDWARE SYNC (Wait for each machine) ---
            console.log(`    [SYNC] Checking ${internalDevices.length} devices...`);
            for (const machine of internalDevices) {
                const mMapping = allDoorDevices.find(dd => (dd.inDeviceIds || []).includes(machine.msId!) || (dd.outDeviceIds || []).includes(machine.msId!));
                const machineDoorId = mMapping?.doorId;

                let shouldBlock = true;
                if (!blockAllInternal && machineDoorId) {
                    const isAllowed = allowedDoorIds.includes(Number(machineDoorId));
                    shouldBlock = !isAllowed;
                } else {
                    shouldBlock = true;
                }

                if (!shouldBlock) console.log(`       -> ✅ UNBLOCKING Machine ${machine.msId} (Door ${machineDoorId})`);
                await helpers.updateDeviceStatus(empCodeRaw, machine, shouldBlock);
            }

            // --- 6. POSTGRES DB UPDATE WITH VERIFICATION ---
            console.log(`    [DB] Updating PG People table for ${empCodeRaw}...`);
            const updateResult = await db.update(people).set({
                lastSeenTime: punchTime,
                ruleid: ruleToApply,
                currentZone: currentZone,
                lastPunchDoorId: doorDetails.id,
                updatedAt: sql`NOW()`
            })
                .where(eq(people.employeeCode, empCodeRaw))
                .returning();

            if (updateResult.length > 0) {
                console.log(`    [✅ DB SUCCESS] Entry updated for ${empCodeRaw}.`);
            } else {
                console.error(`    [❌ DB FAILED] No row updated! Check if employeeCode "${empCodeRaw}" exists in PG.`);
            }

            // Save Progress after every single punch
            maxId = currentLogId;
            await db.update(cronMaster).set({ lastProcessedId: maxId }).where(eq(cronMaster.code, CRON_CODE));
        }

        // 7. CLEANUP EXPIRED LOCKOUTS
        console.log("\n[+] STEP 4: Checking for expired lockouts...");
        const expired = await db.update(cabinLockouts).set({ status: "expired" })
            .where(and(eq(cabinLockouts.status, "active"), lt(cabinLockouts.lockoutExpiry, new Date()))).returning();

        if (expired.length > 0) {
            console.log(`    -> Found ${expired.length} expired lockouts. Restoring access...`);
            for (const rec of expired) {
                const p = allPeople.find(x => x.employeeCode === rec.employeeCode);
                const r = allRoles.find(x => x.id === p?.roleId);
                let allowed: number[] = [];
                if (r?.doorIds) allowed = Array.isArray(r.doorIds) ? r.doorIds.map(Number) : JSON.parse(r.doorIds as string).map(Number);

                for (const m of internalDevices) {
                    const mDM = allDoorDevices.find(dd => (dd.inDeviceIds || []).includes(m.msId!) || (dd.outDeviceIds || []).includes(m.msId!));
                    const isAllowed = allowed.includes(Number(mDM?.doorId || 0));
                    await helpers.updateDeviceStatus(rec.employeeCode, m, !isAllowed);
                }
                console.log(`    -> Access Restored for Emp: ${rec.employeeCode}`);
            }
        }

        // 8. CRON FINALIZE
        await db.update(cronMaster).set({
            isRunning: false,
            lastStatus: "success",
            lastMessage: `Processed ${punches.length} records. LastID: ${maxId}`
        }).where(eq(cronMaster.code, CRON_CODE));

        console.log(`\n=============================================================`);
        console.log(`>>>>> [FINISH] CRON COMPLETED (Punches: ${punches.length}) <<<<<`);
        console.log(`=============================================================\n`);

    } catch (e) {
        console.error("\n[!] CRITICAL ERROR IN CRON:", e);
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed", lastMessage: String(e) }).where(eq(cronMaster.code, CRON_CODE));
    }
}