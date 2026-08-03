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

const HARDWARE_BATCH_SIZE = 50;

async function runInBatches<T>(
    items: T[],
    batchSize: number,
    worker: (item: T) => Promise<void>,
) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(worker));
        for (const result of results) {
            if (result.status === "rejected") {
                console.error("❌ Hardware command failed:", result.reason);
            }
        }
    }
}

async function syncDeviceStatusWithCommandCheck(
    employeeCode: string,
    machine: any,
    shouldBlock: boolean,
) {
    const empCode = String(employeeCode ?? "").trim();
    const deviceId = Number(machine?.msId);

    if (!empCode || !Number.isFinite(deviceId) || deviceId <= 0) return;

    const requiredState = shouldBlock ? "block" : "unblock";
    const request = mssqlPool.request();
    request.input("deviceId", deviceId);
    request.input("employeePin", `PIN=${empCode}`);

    const result = await request.query(`
        SELECT TOP 1
            DeviceCommandId,
            DeviceId,
            Title,
            Status,
            CreationDate,
            ExecutionDate
        FROM DeviceCommands
        WHERE DeviceId = @deviceId
          AND CHARINDEX(
                @employeePin COLLATE DATABASE_DEFAULT,
                DeviceCommand COLLATE DATABASE_DEFAULT
              ) > 0
          AND (
                Title COLLATE DATABASE_DEFAULT LIKE 'Block User%'
                OR Title COLLATE DATABASE_DEFAULT LIKE 'UnBlock User%'
              )
        ORDER BY DeviceCommandId DESC
    `);

    const latest = result.recordset?.[0];

    if (latest) {
        const title = String(latest.Title ?? "").trim().toLowerCase();
        const status = String(latest.Status ?? "").trim().toLowerCase();
        const latestState = title.startsWith("unblock user")
            ? "unblock"
            : title.startsWith("block user")
                ? "block"
                : "";

        if (latestState === requiredState && status === "success") {
            return;
        }

        if (status === "pending" || status === "failed") {
            const deleteRequest = mssqlPool.request();
            deleteRequest.input("deviceCommandId", Number(latest.DeviceCommandId));
            await deleteRequest.query(`
                DELETE FROM DeviceCommands
                WHERE DeviceCommandId = @deviceCommandId
                  AND LOWER(Status COLLATE DATABASE_DEFAULT) IN ('pending', 'failed')
            `);
        }
    }

    await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
}
export async function runMasterAuthSync() {
    const CRON_CODE = MAIN_GATE_SYNC.CODE;
    const startTime = Date.now();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    console.log(`\n--- 🛠️  STARTING AUTH SYNC [${now.toLocaleTimeString()}] ---`);
    try {
        // STEP 1: AUTO-EXPIRE & MIDNIGHT HARDWARE RESET
        const expiredRecords = await db.update(cabinLockouts)
            .set({ status: 'expired', updatedAt: now })
            .where(and(eq(cabinLockouts.status, 'active'), lt(cabinLockouts.lockoutExpiry, now)))
            .returning({ empCode: cabinLockouts.employeeCode });
        console.log(`⏰ [MIDNIGHT CHECK] Expired lockouts: ${expiredRecords.length}`);
        if (expiredRecords.length > 0) {
            const codes = expiredRecords.map(r => r.empCode);
            console.log(`🔓 [MIDNIGHT CHECK] Expired lockouts for employees: ${codes.join(", ")}`);
            // 1. Database flag reset karein
            await db.update(people)
                .set({ is_lockout_enabled: false })
                .where(inArray(people.employeeCode, codes));
            // 2. FETCH DATA FOR RE-SYNC
            // Humein un logon ko sync karna hai jo Building ke ANDAR (IN) hain
            const [allDevicesReset, allDoorDevicesReset, peopleToSync, assignments] = await Promise.all([
                // db.select().from(devices).where(gt(devices.msId, 0)),
                // db.select().from(doorDevices),
                db.select().from(devices).where(and(gt(devices.msId, 0), eq(devices.isActive, true))),
                db.select().from(doorDevices).where(eq(doorDevices.isActive, true)),
                db.select().from(people).where(and(inArray(people.employeeCode, codes), eq(people.currentZone, ZONES.IN))),
                db.select().from(employeeDoorAssignments).where(inArray(employeeDoorAssignments.employeeCode, codes))
            ]);
            // MIDNIGHT LOGIC:
            // Agar banda building ke andar hai, toh midnight hote hi lockout expiry par 
            // use uske saare assigned doors ka access auto-mil jayega (bina punch kiye).
            for (const person of peopleToSync) {
                const userAssignment = assignments.find(a => a.employeeCode === person.employeeCode);
                await helpers.syncEmployeeHardware(
                    person.employeeCode ?? "", allDevicesReset,
                    allDoorDevicesReset,
                    userAssignment,
                    false // Lockout expire ho gaya hai
                );
            }
            // NOTE: Jo log Building ke BAHAR (OUT) hain, unka lockout toh expire ho gaya hai table mein,
            // lekin unka hardware sync nahi kiya humne. Unhe access tabhi milega jab wo 
            // Main Gate par IN punch karenge (Jo niche Step 5 & 6 mein handle ho jayega).
            console.log(`✅ [MIDNIGHT] Hardware restored for ${peopleToSync.length} employees inside building.`);
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
        const [allDoorDevices, allDevices, allDoors, punchingPeople, punchingVisitors, allAssignments, activeLockouts] = await Promise.all([
            // db.select().from(doorDevices),
            // db.select().from(devices).where(gt(devices.msId, 0)),
            // db.select().from(doors),
            db.select().from(doorDevices).where(eq(doorDevices.isActive, true)),
            db.select().from(devices).where(and(gt(devices.msId, 0), eq(devices.isActive, true))),
            db.select().from(doors).where(eq(doors.isActive, true)),
            db.select().from(people).where(inArray(people.employeeCode, uniqueEmpCodes)),
        //    visitor logic start
            helpers.getPunchingVisitors(uniqueEmpCodes),
            //    visitor logic end
            db.select().from(employeeDoorAssignments).where(inArray(employeeDoorAssignments.employeeCode, uniqueEmpCodes)),
            db.select().from(cabinLockouts).where(and(inArray(cabinLockouts.employeeCode, uniqueEmpCodes), eq(cabinLockouts.status, 'active'), gt(cabinLockouts.lockoutExpiry, now)))
        ]);

        // FAST LOOKUP MAPS: avoid repeated .find() / array scans inside punch + device loops
        const peopleMap = new Map(
            punchingPeople.map((p: any) => [String(p.employeeCode ?? "").trim(), p]),
        );
        const visitorMap = new Map(
            punchingVisitors.map((v: any) => [String(v.employeeCode ?? "").trim(), v]),
        );
        const assignmentMap = new Map(
            allAssignments.map((a: any) => [String(a.employeeCode ?? "").trim(), a]),
        );
        const doorMap = new Map(
            allDoors.map((d: any) => [Number(d.id), d]),
        );
        const deviceDoorMap = new Map<number, any>();
        for (const dd of allDoorDevices) {
            for (const id of [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])]) {
                deviceDoorMap.set(Number(id), dd);
            }
        }
        const lockoutMap = new Map(
            activeLockouts.map((l: any) => [String(l.employeeCode ?? "").trim(), l]),
        );

        console.log(
            `⚡ [AUTH SYNC] Punches=${punches.length}, Employees=${uniqueEmpCodes.length}, Devices=${allDevices.length}, HW concurrency=${HARDWARE_BATCH_SIZE}`
        );

        // STEP 5: LOOP THROUGH PUNCHES
        for (const punch of punches) {
            const currentLogId = Number(punch.DeviceLogId);
            const empCode = (punch.EmployeeCode || "").toString().trim();
            const deviceId = Number(punch.DeviceId);
            const punchTime = new Date(punch.LogDate);
            const doorMapping = deviceDoorMap.get(deviceId);
            const doorDetails = doorMapping ? doorMap.get(Number(doorMapping.doorId)) : undefined;
            // const emp = punchingPeople.find((p) => p.employeeCode === empCode);
            // if (!emp || !doorMapping || !doorDetails) {
            //     await db.update(cronMaster).set({ lastProcessedId: currentLogId }).where(eq(cronMaster.code, CRON_CODE));
            //     continue;
            // }

            // visitor logic start
            // 👈 Visitor prefix ("zimvis") चेक करेंगे
            const isVisitor = helpers.isVisitorCode(empCode);
            const emp = !isVisitor ? peopleMap.get(empCode) : null;
            const visitor = isVisitor ? visitorMap.get(empCode) : null;

            // 👈 Agar dono me se koi bhi nahi mila to skip
            if ((!emp && !visitor) || !doorMapping || !doorDetails) {
                await db.update(cronMaster).set({ lastProcessedId: currentLogId }).where(eq(cronMaster.code, CRON_CODE));
                continue;
            }
            // visitor logic end
            // A. Identify Zone
            const isMainGateDoor = doorDetails.code === MAIN_GATE_SYNC.CODE;
            const isEntry = (doorMapping.inDeviceIds || []).map(Number).includes(deviceId);
            let newZone = isMainGateDoor ? (isEntry ? ZONES.IN : ZONES.OUT) : (isEntry ? ZONES.CABIN : ZONES.IN);
            // --- Updated Logic: Rule ID & Lockout Enabled Flag ---
            let ruleIdToStore = ACCESS_RULES.NO_RULE;
            // let updatedLockoutFlag = emp.is_lockout_enabled ?? false;
            let updatedLockoutFlag = Boolean(emp?.is_lockout_enabled);            if (isMainGateDoor) {
                ruleIdToStore = isEntry ? ACCESS_RULES.MAIN_GATE_IN : ACCESS_RULES.MAIN_GATE_OUT;
                // if (!isEntry) {
                //     updatedLockoutFlag = false;
                // }
            } else {
                if (isEntry) {
                    ruleIdToStore = ACCESS_RULES.CABIN_IN;
                    if (doorDetails.is_lockout_enabled) {
                        updatedLockoutFlag = true;
                    }
                } else {
                    ruleIdToStore = ACCESS_RULES.CABIN_OUT;
                    // Exit par flag false nahi karenge, kyuki restricted cabin se 
                    // nikalne ke baad bhi use block hi rakhna hai
                }
            }
            // --- Lockout Table Insertion (Strict Logic Same) ---
            if (newZone === ZONES.CABIN && doorDetails.is_lockout_enabled) {
                const alreadyLocked = lockoutMap.has(empCode);
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
                    const newLockout = { employeeCode: empCode, doorId: doorDetails.id, status: 'active', lockoutExpiry: expiryTime } as any;
                    activeLockouts.push(newLockout);
                    lockoutMap.set(empCode, newLockout);
                }
            }
            // STEP 6: HARDWARE SYNC (Logic Same)
            const userLockout = lockoutMap.get(empCode);
            const assignment = assignmentMap.get(empCode);
            const normalAllowedIds = Array.isArray(assignment?.doorIds) ? assignment.doorIds.map(Number) : [];
            const hardwareTasks = allDevices
                .map((machine) => {
                    const mDM = deviceDoorMap.get(Number(machine.msId));
                    if (!mDM) return null;

                    const targetDoor = doorMap.get(Number(mDM.doorId));
                    if (!targetDoor) return null;

                    const isTargetMainGate = targetDoor.code === MAIN_GATE_SYNC.CODE;
                    const mDoorId = Number(mDM.doorId);
                    let shouldBlock = true;

                    if (newZone === ZONES.OUT) {
                        shouldBlock = !isTargetMainGate;
                    } else if (newZone === ZONES.CABIN) {
                        shouldBlock = mDoorId !== Number(doorMapping.doorId);
                    } else if (newZone === ZONES.IN) {
                        if (isTargetMainGate) {
                            shouldBlock = false;
                        } else {
                            shouldBlock = userLockout
                                ? mDoorId !== Number(userLockout.doorId)
                                : !normalAllowedIds.includes(mDoorId);
                        }
                    }

                    return { machine, shouldBlock };
                })
                .filter(Boolean) as Array<{ machine: any; shouldBlock: boolean }>;

            await runInBatches(
                hardwareTasks,
                HARDWARE_BATCH_SIZE,
                async ({ machine, shouldBlock }) => {
                    await syncDeviceStatusWithCommandCheck(empCode, machine, shouldBlock);
                },
            );
            // const userLockout = activeLockouts.find(l => l.employeeCode === empCode && l.status === 'active');
            // const assignment = allAssignments.find(a => a.employeeCode === empCode);
            // const normalAllowedIds = Array.isArray(assignment?.doorIds) ? assignment.doorIds.map(Number) : [];
            // for (const machine of allDevices) {
            //     const mDM = allDoorDevices.find((dd) =>
            //         [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])].map(Number).includes(Number(machine.msId))
            //     );
            //     if (!mDM) continue;
            //     const targetDoor = allDoors.find(d => d.id === mDM.doorId);
            //     if (!targetDoor) continue;
            //     const isTargetMainGate = targetDoor.code === MAIN_GATE_SYNC.CODE;
            //     const mDoorId = Number(mDM.doorId);
            //     const isTargetUnit1 = helpers.isUnit1Door(targetDoor.unit); // Unit Check
            //     let shouldBlock = true;
            //     if (newZone === ZONES.OUT) {
            //         // Agar user OUT zone me hai:
            //         if (!isTargetUnit1) {
            //             // Non-UNIT_1 doors ke liye access assign rule ke basis par milega bina Main Gate IN kiye bhi
            //             shouldBlock = userLockout
            //                 ? (mDoorId !== Number(userLockout.doorId))
            //                 : !normalAllowedIds.includes(mDoorId);
            //         } else {
            //             // UNIT_1 doors ke liye OUT par block rahega jab tak Main Gate IN na ho
            //             shouldBlock = !isTargetMainGate;
            //         }
            //     } else if (newZone === ZONES.CABIN) {
            //         shouldBlock = (mDoorId !== Number(doorMapping.doorId));
            //     } else if (newZone === ZONES.IN) {
            //         if (isTargetMainGate) {
            //             shouldBlock = false;
            //         } else {
            //             shouldBlock = userLockout
            //                 ? (mDoorId !== Number(userLockout.doorId))
            //                 : !normalAllowedIds.includes(mDoorId);
            //         }
            //     }
            //     await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
            // }
            // STEP 7: DB UPDATE (Updating new field)
            if (isVisitor) {
                // 👈 Agar Visitor hai to visitorMaster table update hoga
                await helpers.handleVisitorPunchUpdate({
                    empCode,
                    punchTime,
                    doorId: doorDetails.id,
                    ruleId: ruleIdToStore
                });
            } else {
                // 👈 Agar Employee hai to same purana people table update hoga
                await db.update(people).set({
                    lastSeenTime: punchTime,
                    currentZone: newZone,
                    lastPunchDoorId: doorDetails.id,
                    ruleid: ruleIdToStore,
                    is_lockout_enabled: updatedLockoutFlag,
                    updatedAt: new Date()
                }).where(eq(people.employeeCode, empCode));
            }
            // await db.update(people).set({
            //     lastSeenTime: punchTime,
            //     currentZone: newZone,
            //     lastPunchDoorId: doorDetails.id,
            //     ruleid: ruleIdToStore,
            //     is_lockout_enabled: updatedLockoutFlag, // Naya flag update ho raha hai
            //     updatedAt: new Date()
            // }).where(eq(people.employeeCode, empCode));

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