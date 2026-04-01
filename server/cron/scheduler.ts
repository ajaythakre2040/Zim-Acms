import cron from "node-cron";
import { db } from "../db";
import { cronMaster } from "@shared/schema";
import { eq, and } from "drizzle-orm"; // 'and' import karna mat bhoolna
import { runMasterAuthSync } from "./mainGateAuthTask";

const runningTasks = new Map<string, boolean>();

import { MAIN_GATE_SYNC } from "../constant"; // Constant import karein

export async function initCronSystem() {
    console.log("🔍 [SYSTEM] Initializing Master Sync Cron...");

    try {
        const tasks = await db.select()
            .from(cronMaster)
            .where(
                and(
                    eq(cronMaster.isActive, true),
                    eq(cronMaster.code, MAIN_GATE_SYNC.CODE) // <-- Constant wala code use karein
                )
            );

        if (!tasks || tasks.length === 0) {
            // Ab ye error nahi aayega kyunki code 'MG_SYNC_01' match ho jayega
            console.warn(`⚠️ [CRON] No active config found for: ${MAIN_GATE_SYNC.CODE}`);
            return;
        }

        tasks.forEach((task) => {
            const s = task.scheduleSecond || 0;
            const pattern = `*/${s} * * * * *`; // Simplified pattern

            console.log(`✅ [READY] ${task.displayName} scheduled: ${pattern}`);

            cron.schedule(pattern, async () => {
                if (runningTasks.get(task.code)) return;
                runningTasks.set(task.code, true);

                try {
                    // Hamara dynamic function
                    await runMasterAuthSync(); 
                } catch (err: any) {
                    console.error(`❌ [TASK ERROR]:`, err.message);
                } finally {
                    runningTasks.set(task.code, false);
                }
            });
        });
    } catch (dbErr: any) {
        console.error("‼️ [FATAL DB ERROR]:", dbErr.message);
    }
}