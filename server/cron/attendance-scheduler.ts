import cron from "node-cron";
import { processAttendanceBatch } from "./attendance-processor";
import { db, mssqlPool } from "../db";
import { syncMeta } from "@shared/schema";
import { eq } from "drizzle-orm";
import { MAIN_GATE_SYNC } from "../constant";

let isSyncing = false;

export async function runSyncTask() {
    if (isSyncing) return;
    isSyncing = true;

    try {
        const [meta] = await db.select().from(syncMeta).where(eq(syncMeta.syncCode, MAIN_GATE_SYNC.CODE)).limit(1);
        const lastId = meta?.lastProcessedId || 0;

        const request = mssqlPool.request();
        request.input('lastId', lastId);

        // Fetch logs with VerificationType JOIN from MS SQL
        const result = await request.query(
            `SELECT TOP 1000 
        l.DeviceLogId, 
        l.DeviceId, 
        l.EmployeeCode, 
        CONVERT(varchar, l.LogDate, 120) as LogDate,
        l.VerificationType,
        ISNULL(v.Name, 'N/A') AS VerificationTypeName
    FROM DeviceLogs l
    LEFT JOIN VerificationType v ON l.VerificationType = v.Code
    WHERE l.DeviceLogId > @lastId 
    ORDER BY l.DeviceLogId ASC`
        );

        const punches = result.recordset || [];
        if (punches.length > 0) {
            await processAttendanceBatch(punches);

            const latestId = punches[punches.length - 1].DeviceLogId;
            await db.insert(syncMeta)
                .values({ syncCode: MAIN_GATE_SYNC.CODE, lastProcessedId: latestId })
                .onConflictDoUpdate({
                    target: [syncMeta.syncCode],
                    set: { lastProcessedId: latestId, updatedAt: new Date() }
                });
        }
    } catch (err: any) {
        console.error(`❌ Scheduler Error:`, err.message);
    } finally {
        isSyncing = false;
    }
}

export function startAttendanceCron() {
    cron.schedule("*/2 * * * * *", () => runSyncTask()); // Runs every 2 seconds
}