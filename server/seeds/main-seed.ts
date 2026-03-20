import { seedCronMaster } from "./cron-seeds";
// import { seedDevices } from "./device-seeds"; // Future ke liye

async function runAllSeeds() {
    try {
        console.log("🚀 Starting Global Seed...");

        await seedCronMaster();
        // await seedDevices(); // Jab aap dusri file banayein toh yahan add karein

        console.log("✨ All seeds completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

runAllSeeds();