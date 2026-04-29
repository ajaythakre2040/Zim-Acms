import { db } from "../db";
import { menuMaster } from "@shared/schema";

export async function seedMenus() {
    console.log("⏳ Syncing All Menus (No Duplicates, Only Updates)...");

    // Helper function taaki code repeat na ho
    const upsertMenu = async (data: any) => {
        return await db.insert(menuMaster).values(data).onConflictDoUpdate({
            target: [menuMaster.menuCode], // Agar menuCode match hua toh...
            set: {
                title: data.title,
                icon: data.icon,
                parentId: data.parentId,
                sortOrder: data.sortOrder
            } // ...toh ye fields update kar do
        }).returning();
    };

    // 1. Dashboard & Sub-menus
    const [dash] = await upsertMenu({ title: "Dashboard", menuCode: "dash_00", icon: "LayoutDashboard", parentId: 0, sortOrder: 1 });

    await upsertMenu({ title: "Attendance Summary", menuCode: "dash_01", icon: "Activity", parentId: dash.id, sortOrder: 1 });
    await upsertMenu({ title: "Shift Analytics", menuCode: "dash_02", icon: "BarChart3", parentId: dash.id, sortOrder: 2 });
    await upsertMenu({ title: "Live Access Logs", menuCode: "dash_03", icon: "Clock", parentId: dash.id, sortOrder: 3 });

    // 2. Master Data & Sub-menus
    const [mast] = await upsertMenu({ title: "Master Data", menuCode: "mast_00", icon: "Database", parentId: 0, sortOrder: 9 });

    await upsertMenu({ title: "Designation", menuCode: "mast_01", icon: "Briefcase", parentId: mast.id, sortOrder: 1 });
    await upsertMenu({ title: "Department", menuCode: "mast_02", icon: "Building", parentId: mast.id, sortOrder: 2 });
    await upsertMenu({ title: "Role", menuCode: "mast_03", icon: "ShieldCheck", parentId: mast.id, sortOrder: 3 });
    await upsertMenu({ title: "Menu", menuCode: "mast_04", icon: "List", parentId: mast.id, sortOrder: 4 });
    await upsertMenu({ title: "Category", menuCode: "mast_05", icon: "Tags", parentId: mast.id, sortOrder: 5 });
    await upsertMenu({ title: "Company", menuCode: "mast_06", icon: "Factory", parentId: mast.id, sortOrder: 6 });

    // 3. Standalone Menus
    const others = [
        { title: "Employees", menuCode: "emp_01", icon: "Users", parentId: 0, sortOrder: 2 },
        { title: "Shifts", menuCode: "shift_01", icon: "CalendarDays", parentId: 0, sortOrder: 3 },
        { title: "Holidays", menuCode: "holl_01", icon: "Calendar", parentId: 0, sortOrder: 4 },
        { title: "Reports", menuCode: "repo_01", icon: "FileText", parentId: 0, sortOrder: 5 },
        { title: "Cron Master", menuCode: "cron_01", icon: "Timer", parentId: 0, sortOrder: 6 },
        { title: "Doors", menuCode: "door_01", icon: "DoorOpen", parentId: 0, sortOrder: 7 },
        { title: "Devices", menuCode: "dev_01", icon: "Cpu", parentId: 0, sortOrder: 8 },
        { title: "User Admin", menuCode: "uadmin_01", icon: "UserCog", parentId: 0, sortOrder: 10 },
    ];

    for (const m of others) {
        await upsertMenu(m);
    }

    console.log("✅ Database Synced: All menus updated without duplicates.");
}