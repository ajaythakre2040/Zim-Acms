// server/seed.ts
import { seedCabinLockout } from "./cabin-lockout-seed";
import { seedCronMaster } from "./main-gate-seeds";
import { seedMenus } from "./seed-menus";
import { seedPermissions } from "./seed-permissions";
import { seedRoles } from "./seed-roles";
import { seedAdminUser } from "./seed-user";
import { seedShifts } from "./shift-seeder";
import { seedRfidCards } from "../seeds/seed-rfid-cards";

async function runAllSeeds() {
    try {
        console.log("🌱 Starting Database Seeding...");

        console.log("1/6: Seeding Roles...");
        await seedRoles();

        console.log("2/6: Seeding Menus...");
        await seedMenus();

        console.log("3/: Seeding Permissions...");
        await seedPermissions();

        console.log("4/8: Seeding Shifts...");
        await seedShifts();

        console.log("5/8: Seeding Cron Master...");
        await seedCronMaster();

        console.log("6/8: Seeding Cabin Lockout...");
        await seedCabinLockout();

        console.log("7/8: Seeding RFID Cards (MS SQL & PG)...");
        await seedRfidCards();

        console.log("7/8: Seeding Admin User Profile...");
        await seedAdminUser();
        
        console.log("")
        
        console.log("✨ 🚀 DATABASE FULLY SEEDED SUCCESSFULLY!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed Process Failed!");
        console.error("Error Detail:", error);
        process.exit(1);
    }
}

runAllSeeds();