    import { db, mssqlPool } from "../db";
    import { esslService } from "../essl-service";
    import { people, devices, doorDevices, blockUnblockLogs, roles, cronMaster } from "@shared/schema";
    import { eq, and, desc, gt, inArray } from "drizzle-orm";
    import { MAIN_GATE_SYNC } from "../constant";

    export async function runMainGateAuthSync(mainDoorId: number) {
        const cronCode = MAIN_GATE_SYNC.CODE;
        const startTime = Date.now();
        const timestamp = new Date().toLocaleTimeString();

        try {
            console.log(`\n--- 🔄 [CRON START: ${timestamp}] ---`);

            // 1. SAFETY LOCK & STATE CHECK
            const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, cronCode)).limit(1);
            if (!cronState) return console.error(`❌ Cron code '${cronCode}' not found!`);

            if (cronState.isRunning) {
                const lastRunTime = cronState.lastRun ? new Date(cronState.lastRun).getTime() : 0;
                if (Date.now() - lastRunTime < 5 * 60 * 1000) {
                    console.log(`⏳ [SKIP] Already running...`);
                    return;
                }
                console.log(`⚠️ [RESET] Overriding stuck lock.`);
            }

            // 2. CONFIG LOAD: Get ALL Doors (Main Gate + All Cabins)
            const allDoorConfigs = await db.select().from(doorDevices);
            if (allDoorConfigs.length === 0) return console.error(`❌ No doors configured!`);

            // Saare Doors ki IN/OUT ids ka ek master list (For MS SQL Query)
            const allMonitorDeviceIds = allDoorConfigs.flatMap(d => [...(d.inDeviceIds || []), ...(d.outDeviceIds || [])]);

            // 🚀 LOCK DB
            await db.update(cronMaster).set({ isRunning: true, lastRun: new Date() }).where(eq(cronMaster.code, cronCode));

            // 3. FETCH NEW PUNCHES FROM MS SQL
            let lastId = Number(cronState.lastProcessedId || 0);
            const request = mssqlPool.request();

            const activityQuery = lastId === 0
                ? `SELECT EmployeeCode, DeviceId, DeviceLogId FROM DeviceLogs 
                WHERE DeviceId IN (${allMonitorDeviceIds.join(",")}) AND LogDate >= DATEADD(minute, -10, GETDATE())
                ORDER BY DeviceLogId ASC`
                : `SELECT EmployeeCode, DeviceId, DeviceLogId FROM DeviceLogs 
                WHERE DeviceLogId > ${lastId} AND DeviceId IN (${allMonitorDeviceIds.join(",")}) 
                ORDER BY DeviceLogId ASC`;

            const result = await request.query(activityQuery);
            const activePunches = result.recordset;

            if (activePunches.length === 0) {
                await db.update(cronMaster).set({ isRunning: false }).where(eq(cronMaster.code, cronCode));
                console.log("ℹ️ No new punches.");
                return;
            }

            // 4. BULK FETCH (People, Roles, Internal Machines)
            const [allDevices, allPeople, allRoles] = await Promise.all([
                db.select().from(devices).where(gt(devices.msId, 0)),
                db.select().from(people),
                db.select().from(roles)
            ]);

            // Internal machines wo hain jo kisi bhi Door (Main/Cabin) ki entry/exit list mein nahi hain
            const internalMachines = allDevices.filter(d => !allMonitorDeviceIds.includes(d.msId!));
            let maxIdInThisRun = lastId;

            // 5. SYNC LOOP (Strict Zone-Based Access)
            for (const punch of activePunches) {
                const empCode = punch.EmployeeCode;
                const punchId = punch.DeviceId;

                // Identify Door & Direction
                const currentDoor = allDoorConfigs.find(d =>
                    (d.inDeviceIds || []).includes(punchId) || (d.outDeviceIds || []).includes(punchId)
                );
                if (!currentDoor) continue;

                const isInsidePunch = (currentDoor.inDeviceIds || []).includes(punchId);
                const isMainGate = currentDoor.doorId === mainDoorId;

                const emp = allPeople.find(p => p.employeeCode === empCode);
                const role = allRoles.find(r => r.id === emp?.roleId);
                const allowedMsIds = (role?.doorIds as number[]) || [];

                console.log(`👤 Emp: ${empCode} | Door: ${currentDoor.doorId} | Dir: ${isInsidePunch ? 'IN' : 'OUT'}`);

                // Update Access for all internal machines
                for (const machine of internalMachines) {
                    let shouldBlock = true;

                    if (isMainGate) {
                        // CASE: Main Gate Entry/Exit
                        if (isInsidePunch) {
                            // IN: Building ke andar aaya -> Role access restore
                            shouldBlock = !allowedMsIds.includes(machine.msId!);
                        } else {
                            // OUT: Building se bahar -> Full Block
                            shouldBlock = true;
                        }
                    } else {
                        // CASE: Cabin/Sensitive Area Entry/Exit
                        if (isInsidePunch) {
                            // 🔥 STRICT LOCK: Banda Cabin ke andar gaya.
                            // Requirement: Jab tak OUT nahi hota, baaki sab block.
                            shouldBlock = true;
                        } else {
                            // OUT: Cabin se bahar aaya -> Building access restore
                            shouldBlock = !allowedMsIds.includes(machine.msId!);
                        }
                    }

                    const currentStatus = shouldBlock ? "block" : "unblock";

                    // Change Detection (Duplicate logs/commands check)
                    const [lastLog] = await db.select()
                        .from(blockUnblockLogs)
                        .where(and(eq(blockUnblockLogs.employeeCode, empCode), eq(blockUnblockLogs.deviceId, machine.msId!)))
                        .orderBy(desc(blockUnblockLogs.createdAt)).limit(1);

                    if (lastLog && lastLog.type === currentStatus) continue;

                    try {
                        console.log(`   🚨 [CMD] ${currentStatus.toUpperCase()} -> Dev ${machine.msId}`);
                        await esslService.syncUserBlockStatus(empCode, machine.serialNumber!, shouldBlock);

                        await db.insert(blockUnblockLogs).values({
                            employeeCode: empCode,
                            deviceId: machine.msId!,
                            type: currentStatus,
                            createdAt: new Date()
                        });

                        // Thoda sa delay hardware stability ke liye
                        await new Promise(r => setTimeout(r, 500));
                    } catch (err: any) {
                        console.error(`   ❌ Hardware Error (Dev ${machine.msId}): ${err.message}`);
                    }
                }

                if (Number(punch.DeviceLogId) > maxIdInThisRun) maxIdInThisRun = Number(punch.DeviceLogId);
            }

            // 6. FINALIZE & UNLOCK
            const duration = Math.floor((Date.now() - startTime) / 1000);
            await db.update(cronMaster).set({
                isRunning: false,
                lastProcessedId: maxIdInThisRun,
                lastRunDuration: duration,
                lastStatus: "success"
            }).where(eq(cronMaster.code, cronCode));

            console.log(`✅ [FINISHED] Pointer: ${maxIdInThisRun} | Time: ${duration}s`);

        } catch (err: any) {
            console.error("‼️ [FATAL ERROR]:", err.message);
            await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed" }).where(eq(cronMaster.code, cronCode));
        }
    }