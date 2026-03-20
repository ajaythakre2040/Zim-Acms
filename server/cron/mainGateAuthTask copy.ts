import { db, mssqlPool } from "../db";
import { esslService } from "../essl-service";
import { people, devices, doorDevices, blockUnblockLogs, roles } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export async function runMainGateAuthSync(doorId: number) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n--- 🔄 [CRON START: ${timestamp}] ---`);

    try {
        // 1. GATE CONFIGURATION (IN/OUT Devices)
        const doorConfig = await db.select().from(doorDevices).where(eq(doorDevices.doorId, doorId)).limit(1).then(r => r[0]);
        if (!doorConfig) {
            console.error("❌ Door config not found!");
            return;
        }

        const inGateIds = doorConfig.inDeviceIds || [];
        const outGateIds = doorConfig.outDeviceIds || [];
        const allGateIds = [...inGateIds, ...outGateIds];

        // 2. FETCH LATEST PUNCH (Strictly by DeviceLogId to get real latest)
        const request = mssqlPool.request();
        const activityQuery = `
            SELECT EmployeeCode, DeviceId, LogDate FROM (
                SELECT EmployeeCode, DeviceId, LogDate,
                ROW_NUMBER() OVER (PARTITION BY EmployeeCode ORDER BY DeviceLogId DESC) as rn
                FROM DeviceLogs 
                WHERE DeviceId IN (${allGateIds.join(",")}) 
                AND CAST(LogDate AS DATE) = CAST(GETDATE() AS DATE)
            ) t WHERE rn = 1`;

        const result = await request.query(activityQuery);
        const activePunches = result.recordset;

        if (activePunches.length === 0) {
            console.log("ℹ️ No gate activity today.");
            return;
        }

        // 3. PROCESS EMPLOYEES
        for (const punch of activePunches) {
            const empCode = punch.EmployeeCode;
            const lastPunchId = punch.DeviceId;
            const isInside = inGateIds.includes(lastPunchId);

            console.log(`\n👤 [CHECK] Emp: ${empCode} | Status: ${isInside ? '👉 ENTERING' : '👈 EXITING'}`);

            // 1. Employee aur Role fetch karo
            const [emp] = await db.select().from(people).where(eq(people.employeeCode, empCode)).limit(1);

            let allowedMsIds: number[] = [];
            let hasValidRole = false;

            // 🛡️ NEW LOGIC: Check if user has a role
            if (emp && emp.roleId) {
                const [roleData] = await db.select().from(roles).where(eq(roles.id, emp.roleId)).limit(1);
                if (roleData) {
                    allowedMsIds = roleData.deviceIds || [];
                    hasValidRole = true;
                    console.log(`📜 [ROLE] ${roleData.name} | Allowed: [${allowedMsIds.join(", ")}]`);
                }
            } else {
                // Agar user nahi mila ya role nahi hai
                console.warn(`⚠️ [SECURITY] Emp ${empCode} has NO ROLE. Force blocking all internal devices.`);
                hasValidRole = false;
            }

            const allDevices = await db.select().from(devices);
            const internalDevices = allDevices.filter(d => d.msId !== null && !allGateIds.includes(d.msId));

            // STEP 4: Device-by-Device Sync
            for (const dev of internalDevices) {
                let shouldBlock = true;

                if (isInside && hasValidRole) {
                    // Agar banda andar hai AUR uska role valid hai, tabhi allowed check karo
                    const isAllowed = dev.msId !== null && allowedMsIds.includes(dev.msId);
                    shouldBlock = !isAllowed;
                } else {
                    // Agar banda OUT hai YA uska ROLE NAHI HAI -> Hamesha BLOCK karo
                    shouldBlock = true;
                }

                const currentStatus = shouldBlock ? "block" : "unblock";

                // CHANGE DETECTION (Pehle wala logic same rahega)
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
                    await new Promise(res => setTimeout(res, 1200));
                } catch (err: any) {
                    console.error(`   ❌ Failed Dev ${dev.msId}: ${err.message}`);
                }
            }
        }
        console.log(`\n--- ✅ [CRON FINISHED] ---`);

    } catch (err: any) {
        console.error("‼️ FATAL CRON ERROR:", err.message);
    }
}