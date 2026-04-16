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
import { ZONES, MAIN_GATE_SYNC, ACCESS_RULES } from "../constant";
import * as helpers from "../helpers/cronHelpers";

export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE; // "MG_SYNC_01"
    const startTime = Date.now();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    console.log(`\n--- 🛠️  STARTING AUTH SYNC [${now.toLocaleTimeString()}] ---`);

    try {
        // STEP 1: AUTO-EXPIRE OLD LOCKOUTS
        await db.update(cabinLockouts)
            .set({ status: 'expired', updatedAt: now })
            .where(and(eq(cabinLockouts.status, 'active'), lt(cabinLockouts.lockoutExpiry, now)));
        console.log(`🧹 [STEP 1] Lockouts expired check done.`);

        // STEP 2: CRON STATUS & LOCKING
        const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, CRON_CODE)).limit(1);

        if (!cronState || !cronState.isActive) return;
        if (cronState.isRunning) {
            console.warn("🚫 Cron is already marked 'isRunning'. Stopping.");
            return;
        }

        await db.update(cronMaster).set({ isRunning: true, lastRun: sql`NOW()` }).where(eq(cronMaster.code, CRON_CODE));
        console.log(`🔓 [STEP 2] Cron locked.`);

        // STEP 3: FETCH PUNCHES
        const lastProcessedId = Number(cronState.lastProcessedId || 0);
        const punchResult = await mssqlPool.request().query(`
            SELECT EmployeeCode, DeviceId, DeviceLogId, LogDate 
            FROM DeviceLogs 
            WHERE DeviceLogId > ${lastProcessedId} AND LogDate >= '${todayStr} 00:00:00'
            ORDER BY DeviceLogId ASC
        `);
        const punches = punchResult.recordset || [];

        if (punches.length === 0) {
            await db.update(cronMaster).set({ isRunning: false }).where(eq(cronMaster.code, CRON_CODE));
            return;
        }

        // STEP 4: FETCH MASTER DATA
        const uniqueEmpCodes = [...new Set(punches.map((p) => (p.EmployeeCode || "").toString().trim()))].filter(Boolean);

        const [allDoorDevices, allDevices, allDoors, punchingPeople, allAssignments, activeLockouts] = await Promise.all([
            db.select().from(doorDevices),
            db.select().from(devices).where(gt(devices.msId, 0)),
            db.select().from(doors),
            db.select().from(people).where(inArray(people.employeeCode, uniqueEmpCodes)),
            db.select().from(employeeDoorAssignments).where(inArray(employeeDoorAssignments.employeeCode, uniqueEmpCodes)),
            db.select().from(cabinLockouts).where(and(inArray(cabinLockouts.employeeCode, uniqueEmpCodes), eq(cabinLockouts.status, 'active'), gt(cabinLockouts.lockoutExpiry, now)))
        ]);

        // STEP 5: LOOP THROUGH PUNCHES
        for (const punch of punches) {
            const currentLogId = Number(punch.DeviceLogId);
            const empCode = (punch.EmployeeCode || "").toString().trim();
            const deviceId = Number(punch.DeviceId);
            const punchTime = new Date(punch.LogDate);

            // Find Mapping
            const doorMapping = allDoorDevices.find((d) =>
                [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])].map(Number).includes(deviceId)
            );

            const doorDetails = allDoors.find((d) => d.id === doorMapping?.doorId);
            const emp = punchingPeople.find((p) => p.employeeCode === empCode);

            if (!emp || !doorMapping || !doorDetails) {
                await db.update(cronMaster).set({ lastProcessedId: currentLogId }).where(eq(cronMaster.code, CRON_CODE));
                continue;
            }

            // A. Identify Zone
            const isMainGateDoor = doorDetails.code === MAIN_GATE_SYNC.CODE;
            const isEntry = (doorMapping.inDeviceIds || []).map(Number).includes(deviceId);

            let newZone = isMainGateDoor ? (isEntry ? ZONES.IN : ZONES.OUT) : (isEntry ? ZONES.CABIN : ZONES.IN);

            // --- NEW: RULE ID LOGIC ---
            let ruleId = ACCESS_RULES.NO_RULE;

            if (isMainGateDoor) {
                // Main Gate logic
                ruleId = isEntry ? ACCESS_RULES.MAIN_GATE_IN : ACCESS_RULES.MAIN_GATE_OUT;
            } else {
                // Internal Doors (Cabin/Lab) logic
                if (isEntry) {
                    ruleId = ACCESS_RULES.CABIN_IN;
                } else {
                    // Agar lockout enabled door se bahar aa raha hai to LOCKOUT_ACTIVE, nahi to normal CABIN_OUT
                    ruleId = doorDetails.is_lockout_enabled ? ACCESS_RULES.LOCKOUT_ACTIVE : ACCESS_RULES.CABIN_OUT;
                }
            }

            // --- NEW: CABIN LOCKOUT INSERTION LOGIC ---
            if (newZone === ZONES.CABIN && doorDetails.is_lockout_enabled) {
                const alreadyLocked = activeLockouts.some(l => l.employeeCode === empCode && l.status === 'active');
                if (!alreadyLocked) {
                    // const punchDate = new Date(punchTime);
                    const expiryTime = new Date();
                    expiryTime.setHours(23, 59, 59, 999);

                    // console.log check ke liye
                    console.log(`🔒 [LOCKOUT] Local Expiry: ${expiryTime.toLocaleString()}`);

                    // Database ke liye Date object ki jagah Format kiya hua string bhejein
                    // format: 'YYYY-MM-DD 23:59:59.999'
                    const expiryString = expiryTime.getFullYear() + "-" +
                        String(expiryTime.getMonth() + 1).padStart(2, '0') + "-" +
                        String(expiryTime.getDate()).padStart(2, '0') +
                        " 23:59:59.999";
                    await db.insert(cabinLockouts).values({
                        employeeCode: empCode,
                        doorId: doorDetails.id,
                        outPunchTime: punchTime,
                        lockoutExpiry: sql`${expiryString}`,
                        status: "active"
                    });
                    activeLockouts.push({ employeeCode: empCode, doorId: doorDetails.id, status: 'active', lockoutExpiry: sql`${expiryString}` } as any);

                    // Agar lockout trigger hua hai to specifically Rule 4 set karein
                    ruleId = ACCESS_RULES.LOCKOUT_ACTIVE;
                }
            }

            // B. Resolve Access Permissions
            const userLockout = activeLockouts.find(l => l.employeeCode === empCode && l.status === 'active');
            const assignment = allAssignments.find(a => a.employeeCode === empCode);
            const normalAllowedIds = Array.isArray(assignment?.doorIds) ? assignment.doorIds.map(Number) : [];

            // STEP 6: HARDWARE SYNC
            for (const machine of allDevices) {
                const mDM = allDoorDevices.find((dd) =>
                    [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])].map(Number).includes(Number(machine.msId))
                );
                if (!mDM) continue;

                const targetDoor = allDoors.find(d => d.id === mDM.doorId);
                const isTargetMainGate = targetDoor?.code === MAIN_GATE_SYNC.CODE;
                const mDoorId = Number(mDM.doorId);

                let shouldBlock = true;

                if (newZone === ZONES.OUT) {
                    shouldBlock = !isTargetMainGate;
                } else if (newZone === ZONES.CABIN) {
                    shouldBlock = (mDoorId !== Number(doorMapping.doorId));
                } else if (newZone === ZONES.IN) {
                    if (isTargetMainGate) {
                        shouldBlock = false;
                    } else {
                        shouldBlock = userLockout
                            ? (mDoorId !== Number(userLockout.doorId))
                            : !normalAllowedIds.includes(mDoorId);
                    }
                }
                await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
            }

            // STEP 7: DB UPDATE
            await db.update(people).set({
                lastSeenTime: punchTime,
                currentZone: newZone,
                lastPunchDoorId: doorDetails.id,
                ruleid: ruleId
            }).where(eq(people.employeeCode, empCode));

            await db.update(cronMaster).set({ lastProcessedId: currentLogId }).where(eq(cronMaster.code, CRON_CODE));
        }

        // STEP 8: RELEASE
        await db.update(cronMaster).set({
            isRunning: false,
            lastStatus: "success",
            lastRunDuration: Math.floor((Date.now() - startTime) / 1000)
        }).where(eq(cronMaster.code, CRON_CODE));

    } catch (e: any) {
        console.error("🔥 CRITICAL CRON ERROR:", e);
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed" }).where(eq(cronMaster.code, CRON_CODE));
    }
}