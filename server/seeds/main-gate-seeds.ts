import { cronMaster, doors } from "@shared/schema";
import { MAIN_GATE_SYNC } from "server/constant";
import { db } from "server/db";

export async function seedCronMaster() {
    console.log("🌱 Seeding Main Gate Task...");

    try {
        // 1. Door Table Entry
        const [door] = await db.insert(doors)
            .values({
                name: MAIN_GATE_SYNC.DISPLAY_NAME,
                code: MAIN_GATE_SYNC.CODE,
                doorType: MAIN_GATE_SYNC.DOOR_TYPE as any,
                isActive: true,
            })
            .onConflictDoUpdate({
                target: doors.code,
                set: { name: MAIN_GATE_SYNC.DISPLAY_NAME }
            })
            .returning({ id: doors.id });

        // 2. Cron Master Entry (Schema ke columns ke hisab se)
        await db.insert(cronMaster)
            .values({
                doorId: door.id,
                displayName: MAIN_GATE_SYNC.DISPLAY_NAME,
                code: MAIN_GATE_SYNC.CODE,
                task: MAIN_GATE_SYNC.TASK_NAME,

                // 🛠️ FIX: Schema mein 'scheduleSecond' hai, 'scheduleTime' nahi
                scheduleSecond: MAIN_GATE_SYNC.DEFAULT_SECONDS,
                scheduleMinute: 0,
                scheduleHour: 0,

                group: MAIN_GATE_SYNC.GROUP,
                priority: MAIN_GATE_SYNC.PRIORITY,
                isActive: true,

                // Defaults for retry and timeout
                retryCount: 3,
                timeoutMinutes: 15,
                isRunning: false
            })
            .onConflictDoUpdate({
                target: cronMaster.code,
                set: {
                    doorId: door.id,
                    displayName: MAIN_GATE_SYNC.DISPLAY_NAME,
                    scheduleSecond: MAIN_GATE_SYNC.DEFAULT_SECONDS
                }
            });

        console.log("✅ Main Gate Seeded Successfully with correct schema fields!");
    } catch (error) {
        console.error("❌ Seeding Error:", error);
    }
}