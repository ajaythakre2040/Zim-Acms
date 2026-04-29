// server/seed.ts
import { seedCabinLockout } from "./cabin-lockout-seed";
import { seedCronMaster } from "./main-gate-seeds";
import { seedMenus } from "./seed-menus";
import { seedPermissions } from "./seed-permissions";
import { seedRoles } from "./seed-roles";
import { seedShifts } from "./shift-seeder";

async function runAllSeeds() {
    try {
        console.log("🌱 Starting Database Seeding...");

        console.log("1/6: Seeding Roles...");
        await seedRoles();

        console.log("2/6: Seeding Menus...");
        await seedMenus();

        console.log("3/6: Seeding Permissions...");
        await seedPermissions();

        console.log("4/6: Seeding Shifts...");
        await seedShifts();

        console.log("5/6: Seeding Cron Master...");
        await seedCronMaster();

        console.log("6/6: Seeding Cabin Lockout...");
        await seedCabinLockout();

        console.log("✨ 🚀 DATABASE FULLY SEEDED SUCCESSFULLY!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed Process Failed!");
        console.error("Error Detail:", error);
        process.exit(1);
    }
}

runAllSeeds();