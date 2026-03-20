import cron from "node-cron";
import { db } from "../db";
import { cronMaster } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { CRON_TASKS } from "../constant";
import { runMainGateAuthSync } from "./mainGateAuthTask";

let isRunning = false; // 🔒 Global Lock

export async function initCronSystem() {
    console.log("🔍 [SYSTEM] Initializing Cron System...");

    try {
        // 1. Fetching tasks from DB
        const tasks = await db.select().from(cronMaster)
            .where(and(
                eq(cronMaster.isActive, true),
                eq(cronMaster.code, CRON_TASKS.MAIN_GATE_SYNC.CODE)
            ));

        // 🛡️ ERROR HANDLING: Agar table khali hai ya config nahi mili
        if (!tasks || tasks.length === 0) {
            console.error("❌ [CRON ERROR] No active configuration found in 'cron_master' table.");
            console.warn(`👉 Check if task with code '${CRON_TASKS.MAIN_GATE_SYNC.CODE}' is present and 'is_active' is true.`);
            return; // Exit initialization
        }

        console.log(`✅ [SYSTEM] Found ${tasks.length} active task(s). Setting up schedules...`);

        tasks.forEach((task) => {
            // scheduleTime check: Agar 0 ya null hai toh crash hone se bachayein
            const interval = task.scheduleTime || 60;
            const pattern = `*/${interval} * * * * *`;

            console.log(`📡 [READY] ${task.displayName} scheduled for every ${interval}s`);

            cron.schedule(pattern, async () => {
                if (isRunning) {
                    console.log(`⏳ [SKIP] ${task.displayName} - Previous cycle still running.`);
                    return;
                }

                isRunning = true;
                const startTime = new Date().toLocaleTimeString();
                console.log(`\n⏱️ [START] ${startTime} - ${task.displayName}`);

                try {
                    // Task Execution
                    await runMainGateAuthSync(task.doorId!);
                } catch (err: any) {
                    console.error(`❌ [TASK ERROR] ${task.displayName} failed:`, err.message);
                } finally {
                    isRunning = false; // Unlock
                }
            });
        });

    } catch (dbErr: any) {
        // Agar Database hi connect nahi ho raha ya table missing hai
        console.error("‼️ [FATAL DB ERROR] Could not fetch cron configuration:", dbErr.message);
    }
}