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
    const CRON_CODE = MAIN_GATE_SYNC.CODE;
    const startTime = Date.now();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    console.log(`\n--- 🛠️  STARTING AUTH SYNC [${now.toLocaleTimeString()}] ---`);

    try {
        // STEP 1: AUTO-EXPIRE OLD LOCKOUTS
        // Purane records ko expire mark karein
        const expiredRecords = await db.update(cabinLockouts)
            .set({ status: 'expired', updatedAt: now })
            .where(and(eq(cabinLockouts.status, 'active'), lt(cabinLockouts.lockoutExpiry, now)))
            .returning({ empCode: cabinLockouts.employeeCode });

        // Unke people table mein flag ko false karein
        if (expiredRecords.length > 0) {
            const codes = expiredRecords.map(r => r.empCode);
            await db.update(people)
                .set({ is_lockout_enabled: false })
                .where(inArray(people.employeeCode, codes));
            console.log(`🧹 [STEP 1] Reset lockout flags for ${codes.length} employees.`);
        }

        // STEP 2: CRON STATUS & LOCKING
        const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, CRON_CODE)).limit(1);
        if (!cronState || !cronState.isActive) return;
        if (cronState.isRunning) return;

        await db.update(cronMaster).set({ isRunning: true, lastRun: sql`NOW()` }).where(eq(cronMaster.code, CRON_CODE));

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

            // --- Updated Logic: Rule ID & Lockout Enabled Flag ---
            let ruleIdToStore = ACCESS_RULES.NO_RULE;
            let lockoutFlag = emp.is_lockout_enabled || false; // Purana state carry karein

            if (isMainGateDoor) {
                ruleIdToStore = isEntry ? ACCESS_RULES.MAIN_GATE_IN : ACCESS_RULES.MAIN_GATE_OUT;
                lockoutFlag = false; // Main gate se out/in par lockout clear
            } else {
                if (isEntry) {
                    ruleIdToStore = ACCESS_RULES.CABIN_IN;
                    if (doorDetails.is_lockout_enabled) lockoutFlag = true;
                } else {
                    ruleIdToStore = ACCESS_RULES.CABIN_OUT;
                    // Exit par flag false nahi karenge, kyuki restricted cabin se 
                    // nikalne ke baad bhi use block hi rakhna hai
                }
            }

            // --- Lockout Table Insertion (Strict Logic Same) ---
            if (newZone === ZONES.CABIN && doorDetails.is_lockout_enabled) {
                const alreadyLocked = activeLockouts.some(l => l.employeeCode === empCode && l.status === 'active');
                if (!alreadyLocked) {
                    const expiryTime = new Date();
                    expiryTime.setHours(23, 59, 59, 999);
                    const expiryString = `${expiryTime.getFullYear()}-${String(expiryTime.getMonth() + 1).padStart(2, '0')}-${String(expiryTime.getDate()).padStart(2, '0')} 23:59:59.999`;

                    await db.insert(cabinLockouts).values({
                        employeeCode: empCode,
                        doorId: doorDetails.id,
                        outPunchTime: punchTime,
                        lockoutExpiry: sql`${expiryString}`,
                        status: "active"
                    });
                    activeLockouts.push({ employeeCode: empCode, doorId: doorDetails.id, status: 'active', lockoutExpiry: expiryTime } as any);
                }
            }

            // STEP 6: HARDWARE SYNC (Logic Same)
            const userLockout = activeLockouts.find(l => l.employeeCode === empCode && l.status === 'active');
            const assignment = allAssignments.find(a => a.employeeCode === empCode);
            const normalAllowedIds = Array.isArray(assignment?.doorIds) ? assignment.doorIds.map(Number) : [];

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

            // STEP 7: DB UPDATE (Updating new field)
            await db.update(people).set({
                lastSeenTime: punchTime,
                currentZone: newZone,
                lastPunchDoorId: doorDetails.id,
                ruleid: ruleIdToStore,
                is_lockout_enabled: lockoutFlag, // Naya flag update ho raha hai
                updatedAt: new Date()
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