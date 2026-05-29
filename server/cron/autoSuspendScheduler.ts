import cron from "node-cron";
import { runAutoSuspendCron } from "./autoSuspendCron";

/**
 * 🔒 Dedicated Scheduler for Employee Auto-Suspension
 * Yeh scheduler background execution ko handle karta hai.
 */
export function initAutoSuspendScheduler(): void {
    try {
        // ⏰ Schedule Frequency: Har raat exact 12:00 AM (Midnight) baje trigger hoga
        cron.schedule("0 0 * * *", () =>
        // cron.schedule("*/2 * * * * *", () =>
             {
            runAutoSuspendCron().catch(() => {
                // Silent block protection
            });
        });
    } catch (error) {
        // Initialization safety trap
    }
}