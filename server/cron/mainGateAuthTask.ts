import { db, mssqlPool } from "../db";
import { esslService } from "../essl-service";
import { people, devices, doorDevices, blockUnblockLogs, roles, cronMaster } from "@shared/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { CRON_TASKS } from "../constant";

export async function runMainGateAuthSync(doorId: number) {
    const cronCode = CRON_TASKS.MAIN_GATE_SYNC.CODE;
    const startTime = Date.now();
    const timestamp = new Date().toLocaleTimeString();

    try {
        console.log(`\n--- 🔄 [CRON ATTEMPT: ${timestamp}] ---`);

        // 1. CRON STATE & SAFETY LOCK
        const [cronState] = await db.select().from(cronMaster).where(eq(cronMaster.code, cronCode)).limit(1);

        if (!cronState) {
            console.error(`❌ [ERROR] Cron code '${cronCode}' not found in database!`);
            return;
        }

        if (cronState.isRunning) {
            const lastRunTime = cronState.lastRun ? new Date(cronState.lastRun).getTime() : 0;
            const timeoutThreshold = 5 * 60 * 1000; // 5 Minutes Safety

            if (Date.now() - lastRunTime > timeoutThreshold) {
                console.log(`⚠️ [FORCE RESET] Cron was stuck for >5 mins. Resetting lock...`);
            } else {
                console.log(`⏳ [SKIP] Cycle already in progress. Last run: ${cronState.lastRun}`);
                return;
            }
        }

        // 2. CONFIGURATION LOAD
        console.log(`🔍 Loading Config for Door ID: ${doorId}...`);
        const doorConfig = await db.select().from(doorDevices).where(eq(doorDevices.doorId, doorId)).limit(1).then(r => r[0]);

        if (!doorConfig) {
            console.error(`❌ [ERROR] No configuration found in 'doorDevices' for doorId: ${doorId}`);
            return;
        }

        const inGateIds = doorConfig.inDeviceIds || [];
        const outGateIds = doorConfig.outDeviceIds || [];
        const allGateIds = [...inGateIds, ...outGateIds];
        console.log(`✅ Config Found. Gates to monitor: ${allGateIds.join(", ")}`);

        // 🚀 LOCK START
        await db.update(cronMaster).set({ isRunning: true, lastRun: new Date() }).where(eq(cronMaster.code, cronCode));

        // 3. FETCH NEW PUNCHES
        let lastId = Number(cronState.lastProcessedId || 0);
        console.log(`📡 Querying MS SQL (LastProcessedId: ${lastId})...`);

        const request = mssqlPool.request();
        // Agar lastId 0 hai toh pichle 10 min ka data uthao (Testing ke liye 5 se 10 kar diya)
        const activityQuery = lastId === 0
            ? `SELECT EmployeeCode, DeviceId, DeviceLogId FROM DeviceLogs 
               WHERE DeviceId IN (${allGateIds.join(",")}) AND LogDate >= DATEADD(minute, -10, GETDATE())
               ORDER BY DeviceLogId ASC`
            : `SELECT EmployeeCode, DeviceId, DeviceLogId FROM DeviceLogs 
               WHERE DeviceLogId > ${lastId} AND DeviceId IN (${allGateIds.join(",")}) 
               ORDER BY DeviceLogId ASC`;

        const result = await request.query(activityQuery);
        const activePunches = result.recordset;

        if (activePunches.length === 0) {
            console.log("ℹ️ [IDLE] No new punches found in MS SQL. Ending cycle.");
            await db.update(cronMaster).set({ isRunning: false }).where(eq(cronMaster.code, cronCode));
            return;
        }

        console.log(`🏃 [PROCESS] Found ${activePunches.length} NEW punches to sync.`);

        // 4. BULK DATA FETCH
        console.log("📦 Fetching People, Roles, and Internal Devices...");
        const [allDevices, allPeople, allRoles] = await Promise.all([
            db.select().from(devices).where(gt(devices.msId, 0)),
            db.select().from(people),
            db.select().from(roles)
        ]);

        const internalDevices = allDevices.filter(d => !allGateIds.includes(d.msId!));
        console.log(`🖥️ Internal devices to sync: ${internalDevices.map(d => d.msId).join(", ")}`);

        let maxIdInThisRun = lastId;

        // 5. SYNC LOOP
        for (const punch of activePunches) {
            const empCode = punch.EmployeeCode;
            const isInside = inGateIds.includes(punch.DeviceId);
            console.log(`👤 Syncing Emp: ${empCode} | Direction: ${isInside ? 'IN' : 'OUT'} | PunchID: ${punch.DeviceLogId}`);

            const emp = allPeople.find(p => p.employeeCode === empCode);
            if (!emp) {
                console.log(`   ⚠️ Emp ${empCode} not found in local People table. Skipping.`);
                if (Number(punch.DeviceLogId) > maxIdInThisRun) maxIdInThisRun = Number(punch.DeviceLogId);
                continue;
            }

            const role = allRoles.find(r => r.id === emp.roleId);
            const allowedMsIds = (role?.deviceIds as number[]) || [];

            // Parallel Sync for all internal devices
            await Promise.all(internalDevices.map(async (dev) => {
                const shouldBlock = !(isInside && role && allowedMsIds.includes(dev.msId!));
                const currentStatus = shouldBlock ? "block" : "unblock";

                // Change Detection
                const [lastLog] = await db.select()
                    .from(blockUnblockLogs)
                    .where(and(eq(blockUnblockLogs.employeeCode, empCode), eq(blockUnblockLogs.deviceId, dev.msId!)))
                    .orderBy(desc(blockUnblockLogs.createdAt)).limit(1);

                if (lastLog && lastLog.type === currentStatus) {
                    // console.log(`   ⏭️ Dev ${dev.msId} already ${currentStatus}.`);
                    return;
                }

                try {
                    console.log(`   🚨 [CMD] ${currentStatus.toUpperCase()} Emp ${empCode} on Dev ${dev.msId}`);
                    await esslService.syncUserBlockStatus(empCode, dev.serialNumber!, shouldBlock);

                    await db.insert(blockUnblockLogs).values({
                        employeeCode: empCode, deviceId: dev.msId!, type: currentStatus, createdAt: new Date()
                    });
                } catch (err: any) {
                    console.error(`   ❌ Hardware Error (Dev ${dev.msId}): ${err.message}`);
                }
            }));

            if (Number(punch.DeviceLogId) > maxIdInThisRun) {
                maxIdInThisRun = Number(punch.DeviceLogId);
            }
        }

        // 6. UPDATE CRON MASTER & UNLOCK
        const duration = Math.floor((Date.now() - startTime) / 1000);
        await db.update(cronMaster)
            .set({
                isRunning: false,
                lastProcessedId: maxIdInThisRun,
                lastRunDuration: duration,
                lastStatus: "success",
                lastMessage: `Synced ${activePunches.length} punches. MaxID: ${maxIdInThisRun}`
            })
            .where(eq(cronMaster.code, cronCode));

        console.log(`✅ [CRON FINISHED] Pointer updated to: ${maxIdInThisRun} | Time: ${duration}s`);

    } catch (err: any) {
        console.error("‼️ [FATAL ERROR]:", err.message);
        await db.update(cronMaster).set({ isRunning: false, lastStatus: "failed", lastMessage: err.message })
            .where(eq(cronMaster.code, cronCode));
    }
}