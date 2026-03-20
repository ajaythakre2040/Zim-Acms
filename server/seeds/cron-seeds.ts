import { db } from "../db";
import { cronMaster } from "@shared/schema";
import { CRON_TASKS } from "../constant";

export async function seedCronMaster() {
    const taskData = CRON_TASKS.MAIN_GATE_SYNC;

    await db.insert(cronMaster)
        .values({
            doorId: taskData.DOOR_ID,
            displayName: taskData.DISPLAY_NAME,
            code: taskData.CODE,
            task: taskData.TASK_NAME,
            scheduleTime: taskData.DEFAULT_SECONDS,
            group: taskData.GROUP,
            priority: taskData.PRIORITY,
            isActive: true,
        })
        .onConflictDoUpdate({
            target: cronMaster.code,
            set: {
                displayName: taskData.DISPLAY_NAME,
                task: taskData.TASK_NAME,
                group: taskData.GROUP
            }
        });

    console.log("🌱 [SEED] Cron Master updated from Constants.");
}