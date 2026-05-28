import { eq, lte, and } from "drizzle-orm";
import { db } from "../db";
// import { EMPLOYEE_STATUS, AUTOSUSPEND_CONFIG } from "../constants";
import { storage } from "../storage";
import { people } from "@shared/schema";
import { AUTOSUSPEND_CONFIG, EMPLOYEE_STATUS } from "../constant";

/**
 * 🔄 Automated Auto-Suspend Service Task
 * Check karega ki kaunse employees pichle 30 din se inactive hain aur unhe block karega.
 */
export async function runAutoSuspendCron(): Promise<void> {
    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - AUTOSUSPEND_CONFIG.MAX_INACTIVE_DAYS);

        // 1. Database se active employees nikaalein jinka last punch time 30 din se purana hai
        const inactiveEmployees = await db
            .select()
            .from(people)
            .where(
                and(
                    eq(people.status, EMPLOYEE_STATUS.ACTIVE),
                    lte(people.lastSeenTime, thresholdDate)
                )
            );

        if (inactiveEmployees.length === 0) {
            return;
        }

        // 2. Loop chalakar ek-ek employee ko block karein
        for (const employee of inactiveEmployees) {
            if (!employee.employeeCode) continue;

            // A. Update Postgres Local DB Status to 'suspended'
            await db
                .update(people)
                .set({
                    status: EMPLOYEE_STATUS.SUSPENDED,
                    updatedAt: new Date()
                })
                .where(eq(people.employeeCode, employee.employeeCode));

            // B. Trigger Instant Total Hardware Device Sync Block
            try {
                await storage.executeHardwareSync(
                    employee.employeeCode,
                    null,
                    true
                );
            } catch (hwError) {
                // Hardware fail hone par background silent try catch block taaki agla loop na ruke
            }
        }
    } catch (error) {
        // Top-level execution shell boundary protection
    }
}