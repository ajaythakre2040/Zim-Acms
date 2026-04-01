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
import { eq, and, gt, lt, sql, inArray } from "drizzle-orm";
import { ACCESS_RULES, ZONES, MAIN_GATE_SYNC } from "../constant";
import * as helpers from "./cronHelpers";

export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const indianTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log(`\n>>>>> [START] CRON EXECUTION: ${indianTime} <<<<<`);

    try {
        // --- STEP 1: CRON STATE ---
        const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, CRON_CODE)).limit(1);
        if (!cronState || !cronState.isActive) return;

        if (cronState.isRunning) {
            const lastRun = cronState.lastRun ? new Date(cronState.lastRun).getTime() : 0;
            if ((new Date().getTime() - lastRun) / 60000 <= 5) return;
        }

        // --- STEP 2: FETCH NEW PUNCHES ---
        let lastId = Number(cronState.lastProcessedId || 0);
        const result = await mssqlPool.request().query(`
            SELECT EmployeeCode, DeviceId, DeviceLogId, LogDate 
            FROM DeviceLogs WHERE DeviceLogId > ${lastId} ORDER BY DeviceLogId ASC
        `);

        const punches = result.recordset || [];
        if (punches.length === 0) return;

        // --- STEP 3: DATA PREPARATION ---
        await db.update(cronMaster).set({ isRunning: true, lastRun: sql`NOW()` }).where(eq(cronMaster.code, CRON_CODE));

        const uniqueEmpCodes = Array.from(new Set(punches.map(p => (p.EmployeeCode || "").trim()).filter(Boolean)));

        const [allDoorDevices, allDevices, targetPeople, allRoles, allDoors] = await Promise.all([
            db.select().from(doorDevices),
            db.select().from(devices).where(gt(devices.msId, 0)),
            db.select().from(people).where(inArray(people.employeeCode, uniqueEmpCodes)),
            db.select().from(roles),
            db.select().from(doors)
        ]);

        const mainGateDoor = allDoors.find(d => d.code === CRON_CODE);
        const mainGateConfig = allDoorDevices.find(dd => dd.doorId === mainGateDoor?.id);
        if (!mainGateConfig) throw new Error("Main Gate Config Missing");

        // Main Gate Device IDs (e.g., 36, 37) - converted to Numbers for safe comparison
        const gateDeviceIds = [...(mainGateConfig.inDeviceIds || []), ...(mainGateConfig.outDeviceIds || [])].map(id => Number(id));

        let maxId = lastId;

        // --- STEP 4: LOOP PUNCHES ---
        for (const punch of punches) {
            const empCode = (punch.EmployeeCode || "").trim();
            if (!empCode) continue;

            const punchId = Number(punch.DeviceId);
            const punchTime = new Date(punch.LogDate);

            const doorMapping = allDoorDevices.find(d => [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])].map(id => Number(id)).includes(punchId));
            const doorDetails = allDoors.find(d => d.id === doorMapping?.doorId);
            const emp = targetPeople.find(p => p.employeeCode === empCode);

            if (!doorMapping || !doorDetails || !emp) continue;

            const isMainGatePunch = doorDetails.code === CRON_CODE;
            const isInside = (doorMapping.inDeviceIds || []).map(id => Number(id)).includes(punchId);
            const role = allRoles.find(r => r.id === emp.roleId);

            // 🔥 IMPORTANT: Ensure allowedIds are Numbers
            const allowedIds = ((role?.doorIds as any[]) || []).map(id => Number(id));
            const hasEnteredToday = helpers.hasEnteredToday(emp, todayStart);

            let ruleToApply = ACCESS_RULES.MAIN_GATE_IN;
            let currentZone = ZONES.IN;
            let blockInternal = true;
            let logMsg = "";

            // --- RULE ENGINE LOGIC ---
            if (isMainGatePunch) {
                if (isInside) {
                    const activeLockout = await helpers.getLockoutStatus(empCode);
                    if (!helpers.hasValidRole(emp)) {
                        ruleToApply = ACCESS_RULES.NO_ROLE; logMsg = "REJECTED: No Role";
                    } else if (activeLockout) {
                        ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE; logMsg = "REJECTED: Lockout";
                    } else {
                        ruleToApply = ACCESS_RULES.MAIN_GATE_IN; currentZone = ZONES.IN;
                        blockInternal = false; // 🔓 Role access starts now
                        logMsg = "ACCEPTED: Entry";
                    }
                } else {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT; currentZone = ZONES.OUT;
                    blockInternal = true; // 🔒 Exit means block internal
                    logMsg = "EXIT: Out";
                }
            } else {
                if (!hasEnteredToday) {
                    ruleToApply = ACCESS_RULES.MAIN_GATE_OUT; logMsg = "SECURITY: No Entry Today";
                } else if (isInside) {
                    ruleToApply = ACCESS_RULES.CABIN_IN; currentZone = ZONES.CABIN;
                    blockInternal = true; // 🔒 Inside Cabin = Internal Blocked
                    logMsg = "CABIN: Entry";
                } else {
                    if (doorDetails.is_lockout_enabled) {
                        ruleToApply = ACCESS_RULES.LOCKOUT_ACTIVE; blockInternal = true;
                        logMsg = "CABIN EXIT: Lockout Triggered";
                        await db.insert(cabinLockouts).values({
                            employeeCode: empCode, doorId: doorDetails.id, outPunchTime: punchTime,
                            lockoutExpiry: new Date(punchTime.getTime() + (cronState.lockoutHours || 2) * 3600000),
                            status: "active"
                        });
                    } else {
                        ruleToApply = ACCESS_RULES.CABIN_OUT; currentZone = ZONES.IN;
                        blockInternal = false; // 🔓 Back to normal role access
                        logMsg = "CABIN EXIT: Normal";
                    }
                }
            }

            console.log(`[PROCESS] Emp: ${empCode} | Door: ${doorDetails.name} | BlockInternal: ${blockInternal} | Msg: ${logMsg}`);

            // --- STEP 5: HARDWARE SYNC (DYNAMIC & ROLE-BASED) ---
            for (const machine of allDevices) {
                const machineId = Number(machine.msId);
                let shouldBlock = true;

                // Rule 1: Main Gate devices are ALWAYS unblocked
                if (gateDeviceIds.includes(machineId)) {
                    shouldBlock = false;
                }
                // Rule 2: If user is "Inside" and not in lockout, check Role
                else if (blockInternal === false) {
                    const hasAccessInRole = allowedIds.includes(machineId);
                    shouldBlock = !hasAccessInRole; // Block if NOT in role
                }
                // Rule 3: Otherwise (Exit/Lockout/Cabin), block internal
                else {
                    shouldBlock = true;
                }

                await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
            }

            // --- STEP 6: DB UPDATES ---
            await db.update(people).set({
                lastSeenTime: punchTime, ruleid: ruleToApply, currentZone,
                lastPunchDoorId: doorMapping.doorId ?? 0, updatedAt: new Date()
            }).where(eq(people.employeeCode, empCode));

            maxId = Number(punch.DeviceLogId);
        }

        // --- STEP 7: EXPIRED LOCKOUTS CLEANUP ---
        const expired = await db.update(cabinLockouts).set({ status: "expired" })
            .where(and(eq(cabinLockouts.status, "active"), lt(cabinLockouts.lockoutExpiry, new Date()))).returning();

        for (const rec of expired) {
            const p = targetPeople.find(x => x.employeeCode === rec.employeeCode);
            if (p) {
                const r = allRoles.find(x => x.id === p.roleId);
                const allowed = ((r?.doorIds as any[]) || []).map(id => Number(id));
                for (const m of allDevices) {
                    const mId = Number(m.msId);
                    const isMG = gateDeviceIds.includes(mId);
                    const sb = isMG ? false : !allowed.includes(mId);
                    await helpers.updateDeviceStatus(rec.employeeCode, m, sb);
                }
            }
        }

        // --- STEP 8: FINALIZE ---
        await db.update(cronMaster).set({ isRunning: false, lastProcessedId: maxId, lastStatus: "success" }).where(eq(cronMaster.code, CRON_CODE));
        console.log(`>>>>> [FINISH] SUCCESS: Processed till ID ${maxId} <<<<<\n`);

    } catch (e) {
        console.error("\n[!] CRITICAL ERROR:", e);
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed" }).where(eq(cronMaster.code, CRON_CODE));
    }
}