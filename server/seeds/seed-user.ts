import { db } from "../db";
import { users, userProfiles, roles, people } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { DEFAULT_ADMIN_CONFIG } from "../constant"; // 👈 Constants file se data import kiya

export async function seedAdminUser() {
    console.log("👤 Seeding Admin User with Bcrypt logic via Constants...");

    try {
        // 1. Super Admin Role search karein code constant se lekar
        const [existingRole] = await db
            .select()
            .from(roles)
            .where(eq(roles.code, DEFAULT_ADMIN_CONFIG.ROLE_CODE));

        if (!existingRole) {
            throw new Error(`'${DEFAULT_ADMIN_CONFIG.ROLE_CODE}' role not found. Please run seedRoles first.`);
        }

        // 2. People table entry using constant variables
        await db.insert(people).values({
            // @ts-ignore
            employeeCode: DEFAULT_ADMIN_CONFIG.EMPLOYEE_CODE,
            employeeName: DEFAULT_ADMIN_CONFIG.EMPLOYEE_NAME,
            isActive: true,
        } as any).onConflictDoNothing();

        console.log("✅ Person record verified.");

        // 3. Password hashing using constant default password
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_CONFIG.DEFAULT_PASSWORD, 10);

        // 4. Admin User create/update
        let [adminUser] = await db
            .insert(users)
            .values({
                fullName: DEFAULT_ADMIN_CONFIG.EMPLOYEE_NAME,
                username: DEFAULT_ADMIN_CONFIG.USERNAME,
                password: hashedPassword,
            })
            .onConflictDoUpdate({
                target: [users.username],
                set: { password: hashedPassword }
            })
            .returning();

        if (!adminUser) {
            [adminUser] = await db.select().from(users).where(eq(users.username, DEFAULT_ADMIN_CONFIG.USERNAME));
        }
        console.log(`✅ User '${DEFAULT_ADMIN_CONFIG.USERNAME}' verified with BCrypt.`);

        // 5. User Profile Link karein using common config codes
        await db
            .insert(userProfiles)
            .values({
                userId: adminUser.id.toString(),
                roleId: existingRole.id,
                employeeCode: DEFAULT_ADMIN_CONFIG.EMPLOYEE_CODE,
                isActive: true,
            })
            .onConflictDoUpdate({
                target: [userProfiles.userId],
                set: { roleId: existingRole.id, isActive: true },
            });

        console.log(`🚀 Seeding Successful! Log with: ${DEFAULT_ADMIN_CONFIG.USERNAME} / ${DEFAULT_ADMIN_CONFIG.DEFAULT_PASSWORD}`);
    } catch (error) {
        console.error("❌ Seed User Failed:", error);
        throw error;
    }
}