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
import { ACCESS_RULES, ZONES, MAIN_GATE_SYNC, CABIN_LOCKOUT_CONFIG } from "../constant";
import * as helpers from "./cronHelpers";

export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE; // 'MG_SYNC_01'

    // Aaj ki date ka start (00:00:00) nikalne ke liye
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const indianTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log(`\n--- [STEP 1] CRON START (IST): ${indianTime} ---`);

    try {
        // 1. Check Cron State
        const [cronState] = await db.select()
            .from(cronMaster)
            .where(eq(cronMaster.code, CRON_CODE))
            .limit(1);

        if (!cronState || !cronState.isActive || cronState.isRunning) {
            console.log("[SKIP] Cron already running or inactive.");
            return;
        }

        console.log("[STEP 2] Fetching Master Data...");
        const [allDoorDevices, allDevices, allPeople, allRoles, allDoors] = await Promise.all([
            db.select().from(doorDevices),
            db.select().from(devices).where(gt(devices.msId, 0)),
            db.select().from(people),
            db.select().from(roles),
            db.select().from(doors)
        ]);

        const mainGateDoor = allDoors.find(d => d.code === CRON_CODE);
        const mainGateConfig = allDoorDevices.find(dd => dd.doorId === mainGateDoor?.id);

        if (!mainGateConfig || !mainGateDoor) {
            console.error(`[ERROR] Main Gate Configuration missing for code: ${CRON_CODE}`);
            return;
        }

        // Gate vs Internal Devices separation
        const gateDeviceIds = [...(mainGateConfig.inDeviceIds || []), ...(mainGateConfig.outDeviceIds || [])];
        const internalDevices = allDevices.filter(d => !gateDeviceIds.includes(d.msId!));

        await db.update(cronMaster).set({ isRunning: true, lastRun: sql`NOW()` }).where(eq(cronMaster.code, CRON_CODE));

        // 2. Fetch Punches from MS SQL (ESSL)
        let lastId = Number(cronState.lastProcessedId || 0);
        const result = await mssqlPool.request().query(`
            SELECT EmployeeCode, DeviceId, DeviceLogId, LogDate 
            FROM DeviceLogs WHERE DeviceLogId > ${lastId} ORDER BY DeviceLogId ASC
        `);

        const punches = result.recordset || [];
        console.log(`[STEP 3] Processing ${punches.length} new punches.`);
        let maxId = lastId;

        for (const punch of punches) {
            const empCode = (punch.EmployeeCode || "").trim();
            if (!empCode) continue;

            const punchId = Number(punch.DeviceId);
            const punchTime = new Date(punch.LogDate);

            // Find mapping & door details
            const doorMapping = allDoorDevices.find(d =>
                [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])].includes(punchId)
            );
            if (!doorMapping) continue;

            const doorDetails = allDoors.find(d => d.id === doorMapping.doorId);
            if (!doorDetails) continue;

            const emp = allPeople.find(p => p.employeeCode === empCode);
            if (!emp || !emp.employeeCode) continue;

            // Logic Flags
            const isMainGatePunch = doorDetails.code === CRON_CODE;
            const isInside = (doorMapping.inDeviceIds || []).includes(punchId);
            const role = allRoles.find(r => r.id === emp.roleId);
            const allowedIds = (role?.doorIds as number[]) || [];

            // 🔥 DATE CHECK: Kya user ne AAJ Main Gate se entry li hai?
            const lastSeen = emp.lastSeenTime ? new Date(emp.lastSeenTime) : null;
            const hasEnteredToday = lastSeen && lastSeen >= todayStart && emp.currentZone !== ZONES.OUT;

            console.log(`\n[LOG] Emp: ${empCode} | Door: ${doorDetails.code} | TodayEntry: ${hasEnteredToday}`);

            let ruleToApply = ACCESS_RULES.MAIN_GATE_IN;
            let currentZone = ZONES.IN;
            let blockInternal = true; // Default: Blocked until Main Gate Entry

            // --- STRICT RULE ENGINE ---
            if (isMainGatePunch) {
                if (isInside) {
                    // Entry at Main Gate
                    const activeLockout = await helpers.getLockoutStatus(emp.employeeCode!);
                    if (!helpers.hasValidRole(emp)) {
                        console.log(`   -> Rejected: No Valid Role.`);
                        ruleToApply = ACCESS_RULES.NO_ROLE;
                        blockInternal = true;
                    } else if (activeLockout) {
                        console.log(`   -> Rejected: Lockout Active.`);
                        ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE;
                        blockInternal = true;
                    } else {
                        console.log(`   -> Accepted: Main Gate Entry. Internal Doors Unlocked.`);
                        ruleToApply = ACCESS_RULES.MAIN_GATE_IN;
                        currentZone = ZONES.IN;
                        blockInternal = false; // Access Open
                    }
                } else {
                    // Exit at Main Gate
                    console.log(`   -> Main Gate Exit. Internal Doors Blocked.`);
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT;
                    currentZone = ZONES.OUT;
                    blockInternal = true;
                }
            } else {
                // Internal Door Punch (Cabin/Office)
                if (!hasEnteredToday) {
                    // ❌ BLOCK: Agar aaj Main Gate Entry nahi hui toh block hi rakho
                    console.warn(`   -> SECURITY BLOCK: No Main Gate entry found for today. Access Denied.`);
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT;
                    currentZone = ZONES.OUT;
                    blockInternal = true;
                } else {
                    // ✅ Allow normal Cabin logic as user is already "IN" today
                    if (isInside) {
                        console.log(`   -> Cabin IN.`);
                        ruleToApply = ACCESS_RULES.CABIN_IN;
                        currentZone = ZONES.CABIN;
                        blockInternal = true;
                    } else {
                        if (doorDetails.is_lockout_enabled) {
                            console.log(`   -> Cabin Exit (Lockout Enabled).`);
                            ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE;
                            blockInternal = true;

                            const durationMs = (cronState.lockoutHours || 2) * 3600000;
                            await db.insert(cabinLockouts).values({
                                employeeCode: emp.employeeCode!,
                                doorId: doorMapping.doorId!,
                                outPunchTime: punchTime,
                                lockoutExpiry: new Date(punchTime.getTime() + durationMs),
                                status: "active"
                            });
                        } else {
                            console.log(`   -> Cabin Exit (Normal).`);
                            ruleToApply = ACCESS_RULES.CABIN_OUT;
                            currentZone = ZONES.IN;
                            blockInternal = false;
                        }
                    }
                }
            }

            // 3. Hardware Sync
            console.log(`   -> Syncing ${internalDevices.length} internal devices.`);
            for (const machine of internalDevices) {
                let shouldBlock = blockInternal ? true : !allowedIds.includes(machine.msId!);
                await helpers.updateDeviceStatus(emp.employeeCode!, machine, shouldBlock);
            }

            // 4. Update People Table
            await db.update(people).set({
                lastSeenTime: punchTime,
                ruleid: ruleToApply,
                currentZone: currentZone,
                lastPunchDoorId: doorMapping.doorId ?? 0,
                updatedAt: new Date()
            }).where(eq(people.employeeCode, emp.employeeCode!));

            maxId = Number(punch.DeviceLogId);
        }

        // 5. Cleanup Expired Lockouts
        const expired = await db.update(cabinLockouts)
            .set({ status: "expired" })
            .where(and(eq(cabinLockouts.status, "active"), lt(cabinLockouts.lockoutExpiry, new Date())))
            .returning();

        if (expired.length > 0) {
            console.log(`[STEP 4] Cleaned ${expired.length} expired lockouts.`);
            for (const rec of expired) {
                const emp = allPeople.find(p => p.employeeCode === rec.employeeCode);
                if (emp && emp.employeeCode) {
                    const role = allRoles.find(r => r.id === emp.roleId);
                    const allowed = (role?.doorIds as number[]) || [];
                    for (const m of internalDevices) {
                        await helpers.updateDeviceStatus(emp.employeeCode!, m, !allowed.includes(m.msId!));
                    }
                }
            }
        }

        // 6. Finish Cron
        await db.update(cronMaster).set({
            isRunning: false,
            lastProcessedId: maxId,
            lastStatus: "success",
            lastMessage: `Processed ${punches.length} records.`
        }).where(eq(cronMaster.code, CRON_CODE));

        console.log(`--- [STEP 5] CRON FINISHED SUCCESSFULLY ---`);

    } catch (e) {
        console.error("\n[CRITICAL ERROR]:", e);
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed" }).where(eq(cronMaster.code, CRON_CODE));
    }
}