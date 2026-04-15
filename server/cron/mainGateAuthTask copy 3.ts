import { db, mssqlPool } from "../db";
import {
    devices,
    doorDevices,
    people,
    cronMaster,
    doors,
    employeeDoorAssignments,
    cabinLockouts
} from "@shared/schema";
import { eq, and, gt, sql, inArray, lt } from "drizzle-orm";
import { ZONES, MAIN_GATE_SYNC } from "../constant";
import * as helpers from "../helpers/cronHelpers";

export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE;
    const startTime = Date.now();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    console.log(`\n--- 🛠️  STARTING AUTH SYNC [${now.toLocaleTimeString()}] ---`);

    try {
        // STEP 1: AUTO-EXPIRE
        const expiryUpdate = await db.update(cabinLockouts)
            .set({ status: 'expired', updatedAt: now })
            .where(and(eq(cabinLockouts.status, 'active'), lt(cabinLockouts.lockoutExpiry, now)));
        console.log(`🧹 [STEP 1] Lockouts expired check done.`);

        // STEP 2: CRON STATUS
        const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, CRON_CODE)).limit(1);
        if (!cronState) { console.error("❌ Cron State not found in DB"); return; }
        if (!cronState.isActive) { console.log("⚠️ Cron is disabled."); return; }

        // Internal Lock Check
        if (cronState.isRunning) {
            console.warn("🚫 Cron is already marked 'isRunning' in DB. Stopping.");
            return;
        }

        await db.update(cronMaster).set({ isRunning: true, lastRun: sql`NOW()` }).where(eq(cronMaster.code, CRON_CODE));
        console.log(`🔓 [STEP 2] Cron locked and marked as Running.`);

        // STEP 3: FETCH PUNCHES
        const lastProcessedId = Number(cronState.lastProcessedId || 0);
        console.log(`🔍 [STEP 3] Fetching punches after ID: ${lastProcessedId} for Date: ${todayStr}`);

        const punchResult = await mssqlPool.request().query(`
            SELECT EmployeeCode, DeviceId, DeviceLogId, LogDate 
            FROM DeviceLogs 
            WHERE DeviceLogId > ${lastProcessedId} AND LogDate >= '${todayStr} 00:00:00'
            ORDER BY DeviceLogId ASC
        `);
        const punches = punchResult.recordset || [];
        console.log(`📊 [DATA] Found ${punches.length} new punches from MS SQL.`);

        if (punches.length === 0) {
            await db.update(cronMaster).set({ isRunning: false }).where(eq(cronMaster.code, CRON_CODE));
            console.log("😴 No new punches. Cron released.");
            return;
        }

        // STEP 4: FETCH MASTER DATA
        const uniqueEmpCodes = [...new Set(punches.map((p) => (p.EmployeeCode || "").toString().trim()))].filter(Boolean);
        console.log(`👥 [STEP 4] Processing ${uniqueEmpCodes.length} unique employees.`);

        const [allDoorDevices, allDevices, allDoors, punchingPeople, allAssignments, activeLockouts] = await Promise.all([
            db.select().from(doorDevices),
            db.select().from(devices).where(gt(devices.msId, 0)),
            db.select().from(doors),
            db.select().from(people).where(inArray(people.employeeCode, uniqueEmpCodes)),
            db.select().from(employeeDoorAssignments).where(inArray(employeeDoorAssignments.employeeCode, uniqueEmpCodes)),
            db.select().from(cabinLockouts).where(and(inArray(cabinLockouts.employeeCode, uniqueEmpCodes), eq(cabinLockouts.status, 'active'), gt(cabinLockouts.lockoutExpiry, now)))
        ]);

        const mainGateDoor = allDoors.find((d) => d.code === CRON_CODE);

        // STEP 5: LOOP
        for (const punch of punches) {
            const currentLogId = Number(punch.DeviceLogId);
            const empCode = (punch.EmployeeCode || "").toString().trim();
            console.log(`\n👉 [PUNCH] ID: ${currentLogId} | Emp: ${empCode} | Device: ${punch.DeviceId}`);

            const doorMapping = allDoorDevices.find((d) => [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])].includes(Number(punch.DeviceId)));
            const doorDetails = allDoors.find((d) => d.id === doorMapping?.doorId);
            const emp = punchingPeople.find((p) => p.employeeCode === empCode);

            if (!emp || !doorDetails) {
                console.warn(`❓ Data Missing for Emp: ${empCode} or Door Mapping. Skipping.`);
                await db.update(cronMaster).set({ lastProcessedId: currentLogId }).where(eq(cronMaster.code, CRON_CODE));
                continue;
            }

            // A. Zone
            const isMainGate = doorDetails.id === mainGateDoor?.id;
            const isEntry = (doorMapping!.inDeviceIds || []).includes(Number(punch.DeviceId));
            let newZone = isMainGate ? (isEntry ? ZONES.IN : ZONES.OUT) : (isEntry ? ZONES.CABIN : ZONES.IN);
            console.log(`📍 Zone Change: ${emp.currentZone} -> ${newZone}`);

            // B. Access List
            const userLockout = activeLockouts.find(l => l.employeeCode === empCode);
            const assignment = allAssignments.find(a => a.employeeCode === empCode);
            const normalAllowedIds = assignment?.doorIds ? (Array.isArray(assignment.doorIds) ? assignment.doorIds.map(Number) : []) : [];
            console.log(userLockout ? `🔒 ACTIVE LOCKOUT found for Door ID: ${userLockout.doorId}` : `📝 Using Normal Assignments: ${normalAllowedIds}`);

            // STEP 6: SYNC
            console.log(`📡 Syncing ${allDevices.length} devices...`);
            for (const machine of allDevices) {
                const mDM = allDoorDevices.find((dd) => [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])].includes(machine.msId!));
                if (!mDM) continue;

                const mDoorId = Number(mDM.doorId);
                const isMainMachine = mDoorId === mainGateDoor?.id;
                let shouldBlock = true;

                if (newZone === ZONES.OUT) { shouldBlock = !isMainMachine; }
                else if (newZone === ZONES.CABIN) { shouldBlock = (mDoorId !== doorDetails.id); }
                else if (newZone === ZONES.IN) {
                    if (isMainMachine) { shouldBlock = false; }
                    else {
                        shouldBlock = userLockout ? (mDoorId !== Number(userLockout.doorId)) : !normalAllowedIds.includes(mDoorId);
                    }
                }

                await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
            }

            // STEP 7: DB UPDATE
            await db.update(people).set({ lastSeenTime: new Date(punch.LogDate), currentZone: newZone, lastPunchDoorId: doorDetails.id }).where(eq(people.employeeCode, empCode));
            await db.update(cronMaster).set({ lastProcessedId: currentLogId }).where(eq(cronMaster.code, CRON_CODE));
            console.log(`✅ [DONE] Processed ID ${currentLogId}`);
        }

        // STEP 8: RELEASE
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "success", lastRunDuration: Math.floor((Date.now() - startTime) / 1000) }).where(eq(cronMaster.code, CRON_CODE));
        console.log(`\n--- ✨ SYNC COMPLETE [Duration: ${Math.floor((Date.now() - startTime) / 1000)}s] ---`);

    } catch (e: any) {
        console.error("🔥 CRITICAL CRON ERROR:", e);
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed" }).where(eq(cronMaster.code, CRON_CODE));
    }
}