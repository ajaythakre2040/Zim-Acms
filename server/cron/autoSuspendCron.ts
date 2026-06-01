import { eq, lte, and } from "drizzle-orm";
import { db, mssqlPool } from "../db";
import { people, blockUnblockLogs } from "@shared/schema";
import { AUTOSUSPEND_CONFIG, EMPLOYEE_STATUS } from "../constant";
import { esslService } from "../services/essl-service";

export async function runAutoSuspendCron(): Promise<void> {
    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - AUTOSUSPEND_CONFIG.MAX_INACTIVE_DAYS);

        const inactiveEmployees = await db
            .select()
            .from(people)
            .where(
                and(
                    eq(people.status, EMPLOYEE_STATUS.ACTIVE),
                    lte(people.lastSeenTime, thresholdDate)
                )
            );

        if (inactiveEmployees.length === 0) return;

        const msDevicesRaw = await mssqlPool
            .request()
            .query("SELECT DeviceID, SerialNumber FROM Devices")
            .then((res: any) => res.recordset as any[]);

        if (!msDevicesRaw?.length) return;

        const lastLogsRaw = await db.select().from(blockUnblockLogs).execute();

        for (const employee of inactiveEmployees) {
            const rawEmpCode = employee.employeeCode || (employee as any).employee_code;
            if (!rawEmpCode) continue;

            const finalEmpCode = String(rawEmpCode).trim();

            await db
                .update(people)
                .set({ status: EMPLOYEE_STATUS.SUSPENDED, updatedAt: new Date() })
                .where(eq(people.employeeCode, finalEmpCode));

            const userLastLogs = lastLogsRaw.filter(l => l.employeeCode === finalEmpCode);

            const syncPromises = msDevicesRaw.map(async (msDevice: any) => {
                const msDeviceId = Number(msDevice.DeviceID || msDevice.DeviceId);
                const serialNumber = msDevice.SerialNumber?.trim();
                if (!serialNumber) return;

                const lastDeviceLog = userLastLogs
                    .filter((l) => l.deviceId === msDeviceId)
                    .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())[0];

                try {
                    await esslService.syncUserBlockStatus(finalEmpCode, serialNumber, true);

                    if (!lastDeviceLog || lastDeviceLog.type !== "block") {
                        await db.insert(blockUnblockLogs).values({
                            employeeCode: finalEmpCode,
                            deviceId: msDeviceId,
                            type: "block",
                            updatedAt: new Date(),
                        });
                    }
                } catch (err) {
                    // Failover shell context protection to keep loop running
                }
            });

            await Promise.all(syncPromises);
        }
    } catch (error) {
        // Top-level crash guard protection boundary
    }
}