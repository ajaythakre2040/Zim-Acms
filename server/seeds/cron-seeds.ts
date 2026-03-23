import { cronMaster, doors } from "@shared/schema";
import { CRON_TASKS } from "server/constant";
import { db } from "server/db";

export async function seedCronMaster() {
    // Hum Object.values use karke loop chala sakte hain agar multiple tasks hain
    const tasks = Object.values(CRON_TASKS);

    for (const taskData of tasks) {
        // 1. Door Update/Insert (Using Code)
        const [door] = await db.insert(doors)
            .values({
                name: taskData.DISPLAY_NAME,
                code: taskData.CODE,
                doorType: taskData.DOOR_TYPE as any,
                isActive: true,
            })
            .onConflictDoUpdate({
                target: doors.code, // Code unique hona chahiye schema mein
                set: { name: taskData.DISPLAY_NAME }
            })
            .returning({ id: doors.id });

        // 2. Cron Master Update/Insert (Linking with generated Door ID)
        await db.insert(cronMaster)
            .values({
                doorId: door.id, // DB se aayi real ID
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
                set: { doorId: door.id, displayName: taskData.DISPLAY_NAME }
            });
    }
}