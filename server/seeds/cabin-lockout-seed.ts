import { cronMaster } from "@shared/schema";
import { CABIN_LOCKOUT_CONFIG } from "server/constant";
import { db } from "server/db";

export async function seedCabinLockout() {
    console.log("🌱 Seeding Cabin Lockout Policy...");

    try {
        // 🚨 Note: Yahan 'db.insert(doors)' nahi hai, kyunki ye hardware nahi logic hai.
        await db.insert(cronMaster)
            .values({
                doorId: null, // Logical task ke liye null
                displayName: CABIN_LOCKOUT_CONFIG.DISPLAY_NAME,
                code: CABIN_LOCKOUT_CONFIG.CODE,
                task: CABIN_LOCKOUT_CONFIG.TASK_NAME,
                
                // Schema mapping: Execution Timer
                scheduleSecond: CABIN_LOCKOUT_CONFIG.DEFAULT_SECONDS,
                scheduleMinute: CABIN_LOCKOUT_CONFIG.DEFAULT_MINUTES,
                scheduleHour: CABIN_LOCKOUT_CONFIG.DEFAULT_HOURS,

                // Schema mapping: Policy Settings
                lockoutHours: CABIN_LOCKOUT_CONFIG.DEFAULT_LOCKOUT_HOURS,
                lockoutMinutes: CABIN_LOCKOUT_CONFIG.DEFAULT_LOCKOUT_MINUTES,

                group: CABIN_LOCKOUT_CONFIG.GROUP,
                priority: CABIN_LOCKOUT_CONFIG.PRIORITY,
                isActive: true,
                isRunning: false,
              
            })
            .onConflictDoUpdate({
                target: cronMaster.code,
                set: { 
                    displayName: CABIN_LOCKOUT_CONFIG.DISPLAY_NAME,
                    lockoutHours: CABIN_LOCKOUT_CONFIG.DEFAULT_LOCKOUT_HOURS
                }
            });

        console.log("✅ Cabin Lockout Policy Seeded Successfully!");
    } catch (error) {
        console.error("❌ Cabin Seed Error:", error);
    }
}