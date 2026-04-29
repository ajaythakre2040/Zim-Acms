import { db } from "../db";
import { roles, menuMaster, rolePermissions } from "@shared/schema";

export async function seedPermissions() {
    console.log("⏳ Syncing Permissions (Insert or Update)...");

    const allRoles = await db.select().from(roles);
    const allMenus = await db.select().from(menuMaster);

    if (allRoles.length === 0 || allMenus.length === 0) {
        console.log("❌ Roles ya Menus nahi mile. Pehle unhe seed karein.");
        return;
    }

    for (const role of allRoles) {
        for (const menu of allMenus) {
            let p = {
                view: false, add: false, edit: false, delete: false, export: false, print: false
            };

            // LOGIC 1: Super Admin - Full Access
            if (role.roleCode === "super_admin") {
                p = { view: true, add: true, edit: true, delete: true, export: true, print: true };
            }

            // LOGIC 2: Gate Security
            else if (role.roleCode === "gate_security") {
                const isAllowed = ["Dashboard", "Live Access Logs", "Attendance Summary"].includes(menu.title);
                p.view = isAllowed;
                p.export = isAllowed;
            }

            // LOGIC 3: HR / Admin Staff
            else if (role.roleCode === "hr_admin") {
                const isMasterSub = ["Designation", "Department", "Category", "Company", "Role", "Menu"].includes(menu.title);
                const isBasic = ["Dashboard", "Employees", "Shifts", "Reports"].includes(menu.title);
                p.view = isMasterSub || isBasic;
                p.add = isMasterSub;
                p.edit = isMasterSub;
                p.export = true;
            }

            // Default logic logic (others)
            else {
                p.view = ["Dashboard", "Attendance Summary"].includes(menu.title);
            }

            // Database Sync (Upsert)
            await db.insert(rolePermissions).values({
                roleId: role.id,
                menuId: menu.id,
                ...p
            }).onConflictDoUpdate({
                target: [rolePermissions.roleId, rolePermissions.menuId], // Unique target
                set: {
                    view: p.view,
                    add: p.add,
                    edit: p.edit,
                    delete: p.delete,
                    export: p.export,
                    print: p.print
                }
            });
        }
    }

    console.log("✅ All role permissions synced successfully!");
}