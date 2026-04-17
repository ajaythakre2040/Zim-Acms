import { seedCabinLockout } from "./cabin-lockout-seed";
import { seedCronMaster } from "./main-gate-seeds";
import { seedShifts } from "./shift-seeder";
// import { seedDevices } from "./device-seeds"; // Future ke liye

async function runAllSeeds() {
    try {
        console.log("⏳ Seeding Shifts...");
        await seedShifts();

        console.log("⏳ Seeding Cron Master...");
        await seedCronMaster();

        console.log("⏳ Seeding Cabin Lockout...");
        await seedCabinLockout();

        console.log("✨ All seeds completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

runAllSeeds();