import { db, mssqlPool } from "../db";
import { doors, doorDevices, cabinLockouts, cronMaster, blockUnblockLogs } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { esslService } from "../essl-service";
import { CABIN_LOCKOUT_CONFIG, MAIN_GATE_SYNC } from "../constant";

export async function processCabinLockout() {
    const TASK_CODE = CABIN_LOCKOUT_CONFIG.CODE;
    const now = new Date();

    try {
        // 1. Fetch Configuration from Postgres
        const config = await db.query.cronMaster.findFirst({
            where: eq(cronMaster.code, TASK_CODE)
        });

        if (!config || !config.isActive) return;

        // 2. Optimization: Get all lockout-enabled doors and their devices
        const lockoutDoors = await db.select({
            doorId: doors.id,
            outDevices: doorDevices.outDeviceIds
        })
            .from(doors)
            .innerJoin(doorDevices, eq(doors.id, doorDevices.doorId))
            .where(eq(doors.is_lockout_enabled, true));

        const deviceToDoorMap = new Map<number, number>();
        lockoutDoors.forEach(d => {
            d.outDevices?.forEach(devId => deviceToDoorMap.set(Number(devId), d.doorId));
        });

        // 3. Get Pointer: Jisse 10 baje se 12 baje wala data miss na ho
        const lastId = config.lastProcessedId || 0;

        // 4. Query MS SQL using raw pool request
        const request = mssqlPool.request();
        request.input('lastId', lastId);

        const logsResult = await request.query(`
            SELECT TOP 500 DeviceLogId, EmployeeCode, LogDate, DeviceId 
            FROM DeviceLogs 
            WHERE DeviceLogId > @lastId 
            AND Direction = 'OUT' 
            ORDER BY DeviceLogId ASC
        `);

        const logs = logsResult.recordset || [];
        if (logs.length === 0) return;

        let maxProcessedId = lastId;

        for (const log of logs) {
            const deviceId = Number(log.DeviceId);

            // Check if this device belongs to a lockout-enabled cabin
            if (deviceToDoorMap.has(deviceId)) {
                const doorId = deviceToDoorMap.get(deviceId)!;

                // Check if already locked
                const existing = await db.query.cabinLockouts.findFirst({
                    where: and(
                        eq(cabinLockouts.employeeCode, log.EmployeeCode),
                        eq(cabinLockouts.status, "active")
                    )
                });

                if (!existing) {
                    // Lockout Duration Calculation (From DB or Constant Fallback)
                    const lHours = config.lockoutHours ?? CABIN_LOCKOUT_CONFIG.DEFAULT_LOCKOUT_HOURS;
                    const lMinutes = config.lockoutMinutes ?? CABIN_LOCKOUT_CONFIG.DEFAULT_LOCKOUT_MINUTES;

                    const lockoutMs = (lHours * 3600 + lMinutes * 60) * 1000;
                    const outPunch = new Date(log.LogDate);
                    const expiry = new Date(outPunch.getTime() + lockoutMs);

                    // Insert into Postgres
                    await db.insert(cabinLockouts).values({
                        employeeCode: log.EmployeeCode,
                        doorId: doorId,
                        outPunchTime: outPunch,
                        lockoutExpiry: expiry,
                        durationHours: lHours,
                        status: "active"
                    });

                    // Hardware Action: Block User
                    await toggleHardwareStatus(log.EmployeeCode, true);
                }
            }
            // Update the pointer for every processed log
            maxProcessedId = log.DeviceLogId;
        }

        // 5. Update Cron Master Row (Only for this task)
        await db.update(cronMaster)
            .set({
                lastProcessedId: maxProcessedId,
                lastRun: new Date(),
                lastStatus: 'success',
                lastMessage: `Processed logs up to ID: ${maxProcessedId}`
            })
            .where(eq(cronMaster.code, TASK_CODE));

        // 6. Cleanup expired lockouts
        await releaseExpiredLockouts();

    } catch (error: any) {
        console.error(`❌ [${TASK_CODE}] Error:`, error.message);
        await db.update(cronMaster)
            .set({ lastStatus: 'failed', lastMessage: error.message, lastRun: new Date() })
            .where(eq(cronMaster.code, TASK_CODE));
    }
}

// async function releaseExpiredLockouts() {
//     const now = new Date();
//     const expired = await db.update(cabinLockouts)
//         .set({ status: "expired", updatedAt: now })
//         .where(and(
//             lt(cabinLockouts.lockoutExpiry, now),
//             eq(cabinLockouts.status, "active")
//         ))
//         .returning();

//     for (const record of expired) {
//         await toggleHardwareStatus(record.employeeCode, false);
//         console.log(`🔓 Released employee: ${record.employeeCode}`);
//     }
// }

// async function toggleHardwareStatus(employeeCode: string, isBlock: boolean) {
//     try {
//         const result = await mssqlPool.request().query("SELECT SerialNumber FROM Devices");
//         const devices = result.recordset || [];

//         for (const dev of devices) {
//             if (dev.SerialNumber) {
//                 await esslService.syncUserBlockStatus(
//                     employeeCode.trim(),
//                     dev.SerialNumber.trim(),
//                     isBlock
//                 );
//             }
//         }
//     } catch (err) {
//         console.error(`Hardware Sync Error:`, err);
//     }
// }


async function toggleHardwareStatus(employeeCode: string, isBlock: boolean) {
    try {
        // 1. Get Main Gate Door ID using the Constant Code
        const mainGateDoor = await db.query.doors.findFirst({
            where: eq(doors.code, MAIN_GATE_SYNC.CODE)
        });

        let excludeDeviceIds: number[] = [];

        if (mainGateDoor) {
            // 2. Main Gate se linked devices (IN aur OUT dono) ki list nikalna
            const mainGateMapping = await db.query.doorDevices.findFirst({
                where: eq(doorDevices.doorId, mainGateDoor.id)
            });

            if (mainGateMapping) {
                // outDeviceIds aur inDeviceIds ko merge karke numbers mein convert karein
                const inDevs = mainGateMapping.inDeviceIds || [];
                const outDevs = mainGateMapping.outDeviceIds || [];
                excludeDeviceIds = [...inDevs, ...outDevs].map(id => Number(id));
            }
        }

        // 3. MS SQL se saari devices fetch karein
        const result = await mssqlPool.request().query("SELECT DeviceID, SerialNumber FROM Devices");
        const allDevices = result.recordset || [];

        for (const dev of allDevices) {
            const mssqlDeviceId = Number(dev.DeviceID);
            const serialNumber = dev.SerialNumber?.trim();

            // 4. CHECK: Agar device Main Gate ki exclusion list mein hai, toh skip karein
            if (excludeDeviceIds.includes(mssqlDeviceId)) {
                // console.log(`⏩ Skipping Main Gate Device: ${mssqlDeviceId}`);
                continue;
            }

            if (!serialNumber) continue;

            // 5. Hardware Sync (Only for Cabins/Other doors)
            await esslService.syncUserBlockStatus(
                employeeCode.trim(),
                serialNumber,
                isBlock
            );

            // 6. Postgres Logs Entry
            await db.insert(blockUnblockLogs).values({
                employeeCode: employeeCode.trim(),
                deviceId: mssqlDeviceId,
                type: isBlock ? "block" : "unblock",
                updatedAt: new Date()
            });
        }

        console.log(`✅ ${isBlock ? '🔒 Blocked' : '🔓 Unblocked'} ${employeeCode} on selective devices.`);
    } catch (err) {
        console.error(`❌ Toggle Hardware Error:`, err);
    }
}
async function releaseExpiredLockouts() {
    const now = new Date();

    // Postgres mein status update karo
    const expired = await db.update(cabinLockouts)
        .set({ status: "expired", updatedAt: now })
        .where(and(
            lt(cabinLockouts.lockoutExpiry, now),
            eq(cabinLockouts.status, "active")
        ))
        .returning();

    for (const record of expired) {
        // 🔥 MAGIC LINE: Hardware aur UserDeviceStatus table dono unblock ho jayenge
        await toggleHardwareStatus(record.employeeCode, false);

        console.log(`✨ Auto-Released: ${record.employeeCode} (Lockout Expired)`);
    }
}