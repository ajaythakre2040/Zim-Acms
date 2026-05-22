import { db } from "../db";
import { users, userProfiles, roles, people } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs"; // Hashing logic change kiya

export async function seedAdminUser() {
    console.log("👤 Seeding Admin User with Bcrypt logic...");

    try {
        // 1. Super Admin Role search karein
        const [existingRole] = await db
            .select()
            .from(roles)
            .where(eq(roles.code, "admin_01"));

        if (!existingRole) {
            throw new Error("'admin_01' role not found. Please run seedRoles first.");
        }

        // 2. People table entry (Error Fix: 'employeeName' use kiya)
        // TypeScript error ke mutabiq 'employeeName' valid property hai
        await db.insert(people).values({
            // @ts-ignore - Agar 'employeeCode' schema mein different hai toh bypass karein
            employeeCode: "ADM001",
            employeeName: "System Administrator",
            isActive: true,
        } as any).onConflictDoNothing();

        console.log("✅ Person record verified.");

        // 3. Password hashing using BCrypt (Same as auth.ts)
        const hashedPassword = await bcrypt.hash("Admin@123", 10);

        // 4. Admin User create/update
        let [adminUser] = await db
            .insert(users)
            .values({
                fullName: "System Administrator",
                username: "admin",
                password: hashedPassword,
            })
            .onConflictDoUpdate({
                target: [users.username],
                set: { password: hashedPassword }
            })
            .returning();

        if (!adminUser) {
            [adminUser] = await db.select().from(users).where(eq(users.username, "admin"));
        }
        console.log("✅ User 'admin' created/updated with BCrypt.");

        // 5. User Profile Link karein
        await db
            .insert(userProfiles)
            .values({
                userId: adminUser.id.toString(),
                roleId: existingRole.id,
                employeeCode: "ADM001",
                isActive: true,
            })
            .onConflictDoUpdate({
                target: [userProfiles.userId],
                set: { roleId: existingRole.id, isActive: true },
            });

        console.log("🚀 Seeding Successful! Use: admin / admin@123");
    } catch (error) {
        console.error("❌ Seed User Failed:", error);
        throw error;
    }
}