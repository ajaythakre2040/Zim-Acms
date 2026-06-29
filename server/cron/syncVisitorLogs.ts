import cron from "node-cron";
import { db, dbMsSql, mssqlPool } from "../db";
import { visitorCardLogs } from "@shared/schema";
import { desc } from "drizzle-orm";

async function syncVisitorCardLogsFromMsSql() {
    // 1. Connection Check: Agar pool connected nahi hai, toh connect karein
    if (!mssqlPool.connected) {
                await mssqlPool.connect();
    }

    const lastRecord = await db
        .select({ msId: visitorCardLogs.msId })
        .from(visitorCardLogs)
        .orderBy(desc(visitorCardLogs.msId))
        .limit(1);

    const lastMsId = Number(lastRecord[0]?.msId || 0);

    // 2. Fetch data
    const msLogs = await dbMsSql
        .select()
        .from({ dbName: "DeviceVisitorCards" })
        .where({});

    if (!msLogs || msLogs.length === 0) return;

    const newLogs = msLogs.filter((log: any) => Number(log.Id || log.DeviceId) > lastMsId);

    for (const log of newLogs) {
        await db.insert(visitorCardLogs).values({
            msId: Number(log.Id || log.DeviceId),
            deviceId: log.DeviceId,
            visitorCardId: log.VisitorCardId,
            command: log.Command,
            status: log.Status,
            visitorCardCode: log.VisitorCardCode,
            
            isDirtyDateTime: log.IsDirtyDateTime || log.isDirtyDateTime,
            syncDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}

export function initSyncVisitorLogsCron() {
    cron.schedule("*/1 * * * *", async () => {
        try {
            await syncVisitorCardLogsFromMsSql();
        } catch (error) {
            console.error("❌ Sync Error (Connection Issue):", error);
        }
    });
}