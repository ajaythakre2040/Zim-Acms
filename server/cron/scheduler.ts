import cron from "node-cron";
import { db } from "../db";
import { cronMaster } from "@shared/schema";
import { eq } from "drizzle-orm";
import { CRON_TASKS } from "../constant";
import { runMainGateAuthSync } from "./mainGateAuthTask";
import { processCabinLockout } from "./cabinLockoutCron"; // Cabin task import karein

// Har task ke liye alag lock track karne ke liye Map
const runningTasks = new Map<string, boolean>();

/**
 * Task code ke basis par sahi function run karta hai
 */
async function executeTask(taskCode: string, taskData: any) {
    switch (taskCode) {
        case CRON_TASKS.MAIN_GATE_SYNC.CODE:
            await runMainGateAuthSync(taskData.doorId!);
            break;
        case CRON_TASKS.CABIN_LOCKOUT_SYNC.CODE:
            await processCabinLockout();
            break;
        default:
            console.warn(`⚠️ [CRON] No execution logic found for task code: ${taskCode}`);
    }
}

export async function initCronSystem() {
    console.log("🔍 [SYSTEM] Initializing Universal Cron System...");

    try {
        // 1. Fetching all active tasks from DB (Sabhi active tasks uthao)
        const tasks = await db.select().from(cronMaster).where(eq(cronMaster.isActive, true));

        if (!tasks || tasks.length === 0) {
            console.warn("⚠️ [CRON] No active configurations found in 'cron_master'.");
            return;
        }

        console.log(`✅ [SYSTEM] Found ${tasks.length} active task(s).`);

        tasks.forEach((task) => {
            // --- DYNAMIC INTERVAL LOGIC ---
            // Hum DB se Hours, Minutes aur Seconds utha rahe hain
            const s = task.scheduleSecond || 0;
            const m = task.scheduleMinute || 0;
            const h = task.scheduleHour || 0;

            // Pattern: Agar 0 hai to "*" (every), agar value hai to "*/value" (interval)
            const secPart = s > 0 ? `*/${s}` : "0"; // Default 0 sec agar m/h set hai
            const minPart = m > 0 ? `*/${m}` : "*";
            const hourPart = h > 0 ? `*/${h}` : "*";

            const pattern = `${secPart} ${minPart} ${hourPart} * * *`;

            console.log(`📡 [READY] ${task.displayName} scheduled: ${pattern}`);

            cron.schedule(pattern, async () => {
                // Task-specific lock check
                if (runningTasks.get(task.code)) {
                    console.log(`⏳ [SKIP] ${task.displayName} - Already running.`);
                    return;
                }

                runningTasks.set(task.code, true); // Lock this task
                console.log(`\n⏱️ [START] ${new Date().toLocaleTimeString()} - ${task.displayName}`);

                try {
                    await executeTask(task.code, task);
                } catch (err: any) {
                    console.error(`❌ [TASK ERROR] ${task.displayName} failed:`, err.message);
                } finally {
                    runningTasks.set(task.code, false); // Unlock this task
                }
            });
        });

    } catch (dbErr: any) {
        console.error("‼️ [FATAL DB ERROR] Initializing cron system failed:", dbErr.message);
    }
}