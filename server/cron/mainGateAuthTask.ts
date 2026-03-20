import { db, mssqlPool } from "../db";
import { esslService } from "../essl-service";
import { people, devices, doorDevices, blockUnblockLogs, roles } from "@shared/schema";
import { eq, and, desc, gt } from "drizzle-orm";

export async function runMainGateAuthSync(doorId: number) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n--- 🔄 [CRON START: ${timestamp}] ---`);

    try {
        // 1. GATE CONFIGURATION
        const doorConfig = await db.select().from(doorDevices).where(eq(doorDevices.doorId, doorId)).limit(1).then(r => r[0]);
        if (!doorConfig) return;

        const inGateIds = doorConfig.inDeviceIds || [];
        const outGateIds = doorConfig.outDeviceIds || [];
        const allGateIds = [...inGateIds, ...outGateIds];

        // 🚀 OPTIMIZATION 1: Sirf pichle 2-3 minutes ka data uthao (Delta Sync)
        // Taaki 1000 logo ke purane records baar-baar loop na chalein
        const request = mssqlPool.request();
        const activityQuery = `
            SELECT EmployeeCode, DeviceId, DeviceLogId FROM (
                SELECT EmployeeCode, DeviceId, DeviceLogId,
                ROW_NUMBER() OVER (PARTITION BY EmployeeCode ORDER BY DeviceLogId DESC) as rn
                FROM DeviceLogs 
                WHERE DeviceId IN (${allGateIds.join(",")}) 
                AND LogDate >= DATEADD(minute, -3, GETDATE()) -- ✅ Sirf last 3 mins ka data
            ) t WHERE rn = 1`;

        const result = await request.query(activityQuery);
        const activePunches = result.recordset;

        if (activePunches.length === 0) {
            // console.log("ℹ️ No new gate activity in last 3 mins.");
            return;
        }

        console.log(`🏃 [SPEED] Processing ${activePunches.length} recent employee movements...`);

        // 2. FETCH ALL INTERNAL DEVICES ONCE (Loop ke bahar taaki speed badhe)
        const allDevices = await db.select().from(devices);
        const internalDevices = allDevices.filter(d => d.msId !== null && !allGateIds.includes(d.msId));

        // 3. PROCESS RECENT EMPLOYEES
        for (const punch of activePunches) {
            const empCode = punch.EmployeeCode;
            const lastPunchId = punch.DeviceId;
            const isInside = inGateIds.includes(lastPunchId);

            // Get Employee Data
            const [emp] = await db.select().from(people).where(eq(people.employeeCode, empCode)).limit(1);

            let allowedMsIds: number[] = [];
            let hasValidRole = false;

            if (emp && emp.roleId) {
                const [roleData] = await db.select().from(roles).where(eq(roles.id, emp.roleId)).limit(1);
                if (roleData) {
                    allowedMsIds = roleData.deviceIds || [];
                    hasValidRole = true;
                }
            }

            // STEP 4: Device-by-Device Sync
            for (const dev of internalDevices) {
                let shouldBlock = true;

                if (isInside && hasValidRole) {
                    shouldBlock = !allowedMsIds.includes(dev.msId!);
                } else {
                    shouldBlock = true;
                }

                const currentStatus = shouldBlock ? "block" : "unblock";

                // CHANGE DETECTION (Duplicate entries check)
                const [lastLog] = await db.select()
                    .from(blockUnblockLogs)
                    .where(and(
                        eq(blockUnblockLogs.employeeCode, empCode),
                        eq(blockUnblockLogs.deviceId, dev.msId!)
                    ))
                    .orderBy(desc(blockUnblockLogs.createdAt))
                    .limit(1);

                if (lastLog && lastLog.type === currentStatus) continue;

                try {
                    console.log(`   🚨 [SYNC] Emp ${empCode} -> Dev ${dev.msId} (${currentStatus.toUpperCase()})`);
                    await esslService.syncUserBlockStatus(empCode, dev.serialNumber!, shouldBlock);

                    await db.insert(blockUnblockLogs).values({
                        employeeCode: empCode,
                        deviceId: dev.msId!,
                        type: currentStatus,
                        createdAt: new Date()
                    });

                    // Thoda sa delay taaki hardware hang na ho
                    await new Promise(res => setTimeout(res, 800));
                } catch (err: any) {
                    console.error(`   ❌ Failed Dev ${dev.msId}: ${err.message}`);
                }
            }
        }
        console.log(`--- ✅ [CRON FINISHED] ---`);

    } catch (err: any) {
        console.error("‼️ FATAL CRON ERROR:", err.message);
    }
}