import { MENU_CONFIG } from "../constant";
import { db } from "../db";
import { menuMaster } from "@shared/schema";

export async function seedMenus() {
    console.log("⏳ Syncing All Menus from Constants...");

    const upsertMenu = async (config: any, parentId: number = 0, sortOrder: number = 1) => {
        return await db.insert(menuMaster).values({
            title: config.title,
            code: config.code,
            icon: config.icon,
            parentId: parentId,
            sortOrder: sortOrder
        }).onConflictDoUpdate({
            target: [menuMaster.code],
            set: {
                title: config.title,
                icon: config.icon,
                parentId: parentId,
                sortOrder: sortOrder
            }
        }).returning();
    };

    try {
        // 1. Dashboard & its Children
        const [dash] = await upsertMenu(MENU_CONFIG.DASHBOARD, 0, 1);
        await upsertMenu(MENU_CONFIG.ATTENDANCE_SUMMARY, dash.id, 1);
        await upsertMenu(MENU_CONFIG.SHIFT_ANALYTICS, dash.id, 2);
        await upsertMenu(MENU_CONFIG.LIVE_LOGS, dash.id, 3);

        // 2. Master Data & its Children
        const [mast] = await upsertMenu(MENU_CONFIG.MASTER_DATA, 0, 9);
        await upsertMenu(MENU_CONFIG.DESIGNATION, mast.id, 1);
        await upsertMenu(MENU_CONFIG.DEPARTMENT, mast.id, 2);
        await upsertMenu(MENU_CONFIG.ROLE, mast.id, 3);
        await upsertMenu(MENU_CONFIG.MENU_MASTER, mast.id, 4);
        await upsertMenu(MENU_CONFIG.CATEGORY, mast.id, 5);
        await upsertMenu(MENU_CONFIG.COMPANY, mast.id, 6);

        // 3. Standalone Menus
        const standalone = [
            { cfg: MENU_CONFIG.EMPLOYEES, order: 2 },
            { cfg: MENU_CONFIG.SHIFTS, order: 3 },
            { cfg: MENU_CONFIG.HOLIDAYS, order: 4 },
            { cfg: MENU_CONFIG.REPORTS, order: 5 },
            { cfg: MENU_CONFIG.CRON_MASTER, order: 6 },
            { cfg: MENU_CONFIG.DOORS, order: 7 },
            { cfg: MENU_CONFIG.DEVICES, order: 8 },
            { cfg: MENU_CONFIG.USER_ADMIN, order: 10 },
        ];

        for (const item of standalone) {
            await upsertMenu(item.cfg, 0, item.order);
        }

        console.log("✅ Database Synced successfully with Constants!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
}