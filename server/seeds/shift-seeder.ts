import { db } from "../db"; 
import { shifts } from "../../shared/schema";
import { eq } from "drizzle-orm";

export async function seedShifts() {
    console.log("🚀 Starting Shift Seeder...");

    const shiftData = [
        {
            name: "Shift A (Morning)",
            code: "SH_A",
            startTime: "07:30",
            endTime: "16:00",
            workingHours: 8.5,
            thresholdMins: 30, // Flexibility ±30 mins
            isActive: true,
        },
        {
            name: "Shift B (Noon)",
            code: "SH_B",
            startTime: "15:30",
            endTime: "00:00",
            workingHours: 8.5,
            thresholdMins: 30,
            isActive: true,
        },
        {
            name: "Shift C (Night)",
            code: "SH_C",
            startTime: "23:30",
            endTime: "07:30",
            workingHours: 8.0,
            thresholdMins: 30,
            isActive: true,
        },
        {
            name: "Shift D (Morning-1)",
            code: "SH_D",
            startTime: "06:00",
            endTime: "14:30",
            workingHours: 8.5,
            thresholdMins: 30,
            isActive: true,
        },
        {
            name: "Shift E (Evening)",
            code: "SH_E",
            startTime: "19:30",
            endTime: "03:30",
            workingHours: 8.0,
            thresholdMins: 30,
            isActive: true,
        },
        {
            name: "Shift F (Noon-1)",
            code: "SH_F",
            startTime: "14:00",
            endTime: "22:30",
            workingHours: 8.5,
            thresholdMins: 30,
            isActive: true,
        },
        {
            name: "Shift G (General)",
            code: "SH_G",
            startTime: "09:00",
            endTime: "17:30",
            workingHours: 8.5,
            thresholdMins: 30,
            isActive: true,
        },
    ];

    try {
        for (const data of shiftData) {
            // Check if shift already exists by code
            const existing = await db.select().from(shifts).where(eq(shifts.code, data.code));

            if (existing.length === 0) {
                await db.insert(shifts).values(data);
                console.log(`✅ Inserted: ${data.name}`);
            } else {
                await db.update(shifts).set(data).where(eq(shifts.code, data.code));
                console.log(`🔄 Updated: ${data.name}`);
            }
        }
        console.log("✨ Shift seeding completed successfully!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seedShifts();