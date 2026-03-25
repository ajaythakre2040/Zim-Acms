import { db, mssqlPool } from "../db";
import { doors, doorDevices, cabinLockouts, cronMaster } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { esslService } from "../essl-service";
import { CRON_TASKS } from "../constant";

export async function processCabinLockout() {
    const TASK_CODE = CRON_TASKS.CABIN_LOCKOUT_SYNC.CODE;
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
                    const lHours = config.lockoutHours ?? CRON_TASKS.CABIN_LOCKOUT_SYNC.DEFAULT_LOCKOUT_HOURS;
                    const lMinutes = config.lockoutMinutes ?? CRON_TASKS.CABIN_LOCKOUT_SYNC.DEFAULT_LOCKOUT_MINUTES;

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
                lastRun: now,
                lastStatus: 'success',
                lastMessage: `Processed logs up to ID: ${maxProcessedId}`
            })
            .where(eq(cronMaster.code, TASK_CODE));

        // 6. Cleanup expired lockouts
        await releaseExpiredLockouts();

    } catch (error: any) {
        console.error(`❌ [${TASK_CODE}] Error:`, error.message);
        await db.update(cronMaster)
            .set({ lastStatus: 'failed', lastMessage: error.message })
            .where(eq(cronMaster.code, TASK_CODE));
    }
}

async function releaseExpiredLockouts() {
    const now = new Date();
    const expired = await db.update(cabinLockouts)
        .set({ status: "expired", updatedAt: now })
        .where(and(
            lt(cabinLockouts.lockoutExpiry, now),
            eq(cabinLockouts.status, "active")
        ))
        .returning();

    for (const record of expired) {
        await toggleHardwareStatus(record.employeeCode, false);
        console.log(`🔓 Released employee: ${record.employeeCode}`);
    }
}

async function toggleHardwareStatus(employeeCode: string, isBlock: boolean) {
    try {
        const result = await mssqlPool.request().query("SELECT SerialNumber FROM Devices");
        const devices = result.recordset || [];

        for (const dev of devices) {
            if (dev.SerialNumber) {
                await esslService.syncUserBlockStatus(
                    employeeCode.trim(),
                    dev.SerialNumber.trim(),
                    isBlock
                );
            }
        }
    } catch (err) {
        console.error(`Hardware Sync Error:`, err);
    }
}