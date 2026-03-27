import { seedCabinLockout } from "./cabin-lockout-seed";
import { seedCronMaster } from "./main-gate-seeds";
// import { seedDevices } from "./device-seeds"; // Future ke liye

async function runAllSeeds() {
    try {
        console.log("🚀 Starting Global Seed...");

        await seedCronMaster();
        // await seedDevices(); // Jab aap dusri file banayein toh yahan add karein
        await seedCabinLockout();
        console.log("✨ All seeds completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

runAllSeeds();