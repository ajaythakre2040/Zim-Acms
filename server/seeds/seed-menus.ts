import { db } from "../db";
import { menuMaster } from "@shared/schema";

export async function seedMenus() {
    console.log("⏳ Syncing All Menus (No Duplicates, Only Updates)...");

    const upsertMenu = async (data: any) => {
        return await db.insert(menuMaster).values(data).onConflictDoUpdate({
            target: [menuMaster.code],
            set: {
                title: data.title,
                icon: data.icon,
                parentId: data.parentId,
                sortOrder: data.sortOrder
            }
        }).returning();
    };

    // 1. Dashboard & Sub-menus
    const [dash] = await upsertMenu({
        title: "Dashboard",
        code: "dash_00",
        icon: "LayoutDashboard", // Dashboard default
        parentId: 0,
        sortOrder: 1
    });

    await upsertMenu({ title: "Attendance Summary", code: "dash_01", icon: "Activity", parentId: dash.id, sortOrder: 1 });
    await upsertMenu({ title: "Shift Analytics", code: "dash_02", icon: "Zap", parentId: dash.id, sortOrder: 2 });
    await upsertMenu({ title: "Live Access Logs", code: "dash_03", icon: "Clock", parentId: dash.id, sortOrder: 3 });

    // 2. Master Data & Sub-menus
    const [mast] = await upsertMenu({
        title: "Master Data",
        code: "mast_00",
        icon: "Layers", // Layers for stacking data
        parentId: 0,
        sortOrder: 9
    });

    await upsertMenu({ title: "Designation", code: "mast_01", icon: "UserCheck", parentId: mast.id, sortOrder: 1 });
    await upsertMenu({ title: "Department", code: "mast_02", icon: "Building2", parentId: mast.id, sortOrder: 2 });
    await upsertMenu({ title: "Role", code: "mast_03", icon: "Shield", parentId: mast.id, sortOrder: 3 });
    await upsertMenu({ title: "Menu", code: "mast_04", icon: "Settings", parentId: mast.id, sortOrder: 4 });
    await upsertMenu({ title: "Category", code: "mast_05", icon: "BookOpen", parentId: mast.id, sortOrder: 5 });
    await upsertMenu({ title: "Company", code: "mast_06", icon: "MapPin", parentId: mast.id, sortOrder: 6 });

    // 3. Standalone Menus (Icons mapped to your Lucide imports)
    const others = [
        { title: "Employees", code: "emp_01", icon: "Users", parentId: 0, sortOrder: 2 },
        { title: "Shifts", code: "shift_01", icon: "CalendarDays", parentId: 0, sortOrder: 3 },
        { title: "Holidays", code: "holl_01", icon: "Calendar", parentId: 0, sortOrder: 4 },
        { title: "Reports", code: "repo_01", icon: "FileText", parentId: 0, sortOrder: 5 },
        { title: "Cron Master", code: "cron_01", icon: "Timer", parentId: 0, sortOrder: 6 },
        { title: "Doors", code: "door_01", icon: "DoorOpen", parentId: 0, sortOrder: 7 },
        { title: "Devices", code: "dev_01", icon: "Cpu", parentId: 0, sortOrder: 8 },
        { title: "User Admin", code: "uadmin_01", icon: "UserCog", parentId: 0, sortOrder: 10 },
    ];

    for (const m of others) {
        await upsertMenu(m);
    }

    console.log("✅ Database Synced: Icons and Hierarchy updated successfully.");
}