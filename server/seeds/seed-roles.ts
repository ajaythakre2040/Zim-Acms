import { db } from "../db";
import { roles } from "@shared/schema";

export async function seedRoles() {
    console.log("⏳ Syncing Roles with Numeric Codes...");

    const rolesData = [
        {
            roleName: "Super Admin",
            roleCode: "admin_01",
            description: "Full system access and configuration"
        },
        {
            roleName: "Security Admin",
            roleCode: "sec_02",
            description: "Hardware and security policy management"
        },
        {
            roleName: "Staff",
            roleCode: "staff_03",
            description: "Office and administrative staff"
        },
        {
            roleName: "Gate Security",
            roleCode: "gate_04",
            description: "Gate entry/exit and live logs monitoring"
        },
        {
            roleName: "Reception",
            roleCode: "rec_05",
            description: "Visitor management and front desk"
        },
        {
            roleName: "Employee",
            roleCode: "emp_06",
            description: "Standard employee access"
        },
        {
            roleName: "Worker",
            roleCode: "wrk_07",
            description: "Basic factory/site worker access"
        }
    ];

    for (const role of rolesData) {
        await db.insert(roles)
            .values(role)
            .onConflictDoUpdate({
                target: [roles.roleCode],
                set: {
                    roleName: role.roleName,
                    description: role.description
                }
            });
    }

    console.log("✅ Roles with numeric codes synced successfully.");
}