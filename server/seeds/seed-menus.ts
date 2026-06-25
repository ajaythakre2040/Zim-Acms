import { MENU_CONFIG } from "../constant";
import { db } from "../db";
import { menuMaster } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedMenus() {
    console.log("⏳ Syncing All Menus from Constants (Skipping existing)...");

    const getOrInsertMenu = async (config: any, parentId: number = 0, sortOrder: number = 1) => {
        const existing = await db.query.menuMaster.findFirst({
            where: eq(menuMaster.code, config.code)
        });

        if (existing) {
            return existing;
        }

        const [newMenu] = await db.insert(menuMaster).values({
            title: config.title,
            code: config.code,
            icon: config.icon,
            parentId: parentId,
            sortOrder: sortOrder
        }).returning();

        return newMenu;
    };

    try {
        // 1. Dashboard & its Children
        const dash = await getOrInsertMenu(MENU_CONFIG.DASHBOARD, 0, 1);
        await getOrInsertMenu(MENU_CONFIG.ATTENDANCE_SUMMARY, dash.id, 1);
        await getOrInsertMenu(MENU_CONFIG.SHIFT_ANALYTICS, dash.id, 2);
        await getOrInsertMenu(MENU_CONFIG.LIVE_LOGS, dash.id, 3);

        // 2. Master Data & its Children
        const mast = await getOrInsertMenu(MENU_CONFIG.MASTER_DATA, 0, 9);
        await getOrInsertMenu(MENU_CONFIG.DESIGNATION, mast.id, 1);
        await getOrInsertMenu(MENU_CONFIG.DEPARTMENT, mast.id, 2);
        await getOrInsertMenu(MENU_CONFIG.ROLE, mast.id, 3);
        await getOrInsertMenu(MENU_CONFIG.MENU_MASTER, mast.id, 4);
        await getOrInsertMenu(MENU_CONFIG.CATEGORY, mast.id, 5);
        await getOrInsertMenu(MENU_CONFIG.COMPANY, mast.id, 6);

        // 3. Visitors & Sub-menus
        const visitors = await getOrInsertMenu(MENU_CONFIG.VISITORS, 0, 12);
        await getOrInsertMenu(MENU_CONFIG.VISITORS_DETAILS, visitors.id, 1);
        await getOrInsertMenu(MENU_CONFIG.VISITOR_CARDS, visitors.id, 2);
        await getOrInsertMenu(MENU_CONFIG.VISITOR_LOGS, visitors.id, 3);

        // 4. Other Standalone Menus
        const standalone = [
            { cfg: MENU_CONFIG.EMPLOYEES, order: 2 },
            { cfg: MENU_CONFIG.SHIFTS, order: 3 },
            { cfg: MENU_CONFIG.HOLIDAYS, order: 4 },
            { cfg: MENU_CONFIG.REPORTS, order: 5 },
            { cfg: MENU_CONFIG.CRON_MASTER, order: 6 },
            { cfg: MENU_CONFIG.DOORS, order: 7 },
            { cfg: MENU_CONFIG.DEVICES, order: 8 },
            { cfg: MENU_CONFIG.USER_ADMIN, order: 10 },
            { cfg: MENU_CONFIG.EMERGENCY_UNBLOCK, order: 11 },
            { cfg: MENU_CONFIG.CONTRACTORS, order: 13 },
            { cfg: MENU_CONFIG.AUDIT_TRAIL, order: 14 },
        ];

        for (const item of standalone) {
            await getOrInsertMenu(item.cfg, 0, item.order);
        }

        console.log("✅ Database Synced successfully with Sub-menus!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
}