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

        // Fetch 1000 records from MS SQL
        const result = await request.query(
            `SELECT TOP 1000 * FROM DeviceLogs WHERE DeviceLogId > @lastId ORDER BY DeviceLogId ASC`
        );

        const punches = result.recordset || [];

        if (punches.length > 0) {
            const timeStr = new Date().toLocaleTimeString();
            console.log(`[${timeStr}] 📥 Processing ${punches.length} records...`);

            await processAttendanceBatch(punches);

            const latestId = punches[punches.length - 1].DeviceLogId;

            await db.insert(syncMeta)
                .values({ syncCode: MAIN_GATE_SYNC.CODE, lastProcessedId: latestId })
                .onConflictDoUpdate({
                    target: [syncMeta.syncCode],
                    set: { lastProcessedId: latestId, updatedAt: new Date() }
                });

            console.log(`[${timeStr}] ✅ Sync Complete. Last ID: ${latestId}`);
        }
    } catch (err: any) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Sync Error:`, err.message);
    } finally {
        isSyncing = false;
    }
}

export function startAttendanceCron() {
    console.log("🚀 ZIM-ACMS Sync Service Running (Every 2s)");
    cron.schedule("*/2 * * * * *", async () => {
        runSyncTask().catch(err => console.error("Cron Crash:", err));
    });
}