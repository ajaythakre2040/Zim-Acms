import { db } from "../db";
import { roles } from "@shared/schema";

export async function seedRoles() {
    console.log("⏳ Syncing Roles with Numeric Codes...");

    const rolesData = [
        {
            roleName: "Super Admin",
            code: "admin_01",
            description: "Full system access and configuration"
        },
        {
            roleName: "Security Admin",
            code: "sec_02",
            description: "Hardware and security policy management"
        },
        {
            roleName: "Staff",
            code: "staff_03",
            description: "Office and administrative staff"
        },
        {
            roleName: "Gate Security",
            code: "gate_04",
            description: "Gate entry/exit and live logs monitoring"
        },
        {
            roleName: "Reception",
            code: "rec_05",
            description: "Visitor management and front desk"
        },
        {
            roleName: "Employee",
            code: "emp_06",
            description: "Standard employee access"
        },
        {
            roleName: "Worker",
            code: "wrk_07",
            description: "Basic factory/site worker access"
        }
    ];

    for (const role of rolesData) {
        await db.insert(roles)
            .values(role)
            .onConflictDoUpdate({
                target: [roles.code],
                set: {
                    roleName: role.roleName,
                    description: role.description
                }
            });
    }

    console.log("✅ Roles with numeric codes synced successfully.");
}