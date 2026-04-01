import { db } from "../db";
import { people, blockUnblockLogs, cabinLockouts } from "@shared/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { esslService } from "../essl-service";
import { ZONES } from "../constant";

/**
 * 1. Check if User entered from Main Gate TODAY
 */
export function hasEnteredToday(emp: any, todayStart: Date): boolean {
    if (!emp || !emp.lastSeenTime) return false;

    const lastSeen = new Date(emp.lastSeenTime);
    // Condition: Aaj ki date honi chaiye aur zone OUT nahi hona chahiye
    return lastSeen >= todayStart && emp.currentZone !== ZONES.OUT;
}

/**
 * 2. Role Validation Logic
 */
export function hasValidRole(emp: any): boolean {
    return !!(emp && emp.roleId !== null && emp.roleId !== undefined && emp.status === "active");
}

/**
 * 3. Lockout Status Check (Expired logic handled)
 */
export async function getLockoutStatus(empCode: string) {
    const lockout = await db.query.cabinLockouts.findFirst({
        where: and(
            eq(cabinLockouts.employeeCode, empCode),
            eq(cabinLockouts.status, "active"),
            gt(cabinLockouts.lockoutExpiry, new Date())
        )
    });
    return lockout ? true : false;
}

/**
 * 4. Hardware Sync Logic (Redundant logs avoid karne ke liye)
 */
export async function updateDeviceStatus(empCode: string, machine: any, shouldBlock: boolean) {
    const type = shouldBlock ? "block" : "unblock";

    // Check last log to avoid unnecessary API calls to hardware
    const lastLog = await db.query.blockUnblockLogs.findFirst({
        where: and(
            eq(blockUnblockLogs.employeeCode, empCode),
            eq(blockUnblockLogs.deviceId, machine.msId!)
        ),
        orderBy: [desc(blockUnblockLogs.createdAt)]
    });

    // Agar hardware pehle se hi desired state mein hai, toh skip karo
    if (lastLog && lastLog.type === type) {
        // console.log(`[SKIP] ${empCode} already ${type}ed on ${machine.msId}`);
        return;
    }

    try {
        if (!machine.serialNumber) {
            console.error(`[SERIAL MISSING] Machine ID ${machine.msId} has no serial number.`);
            return;
        }

        // Real Hardware Sync
        await esslService.syncUserBlockStatus(empCode, machine.serialNumber.trim(), shouldBlock);

        // Success Log in DB
        await db.insert(blockUnblockLogs).values({
            employeeCode: empCode,
            deviceId: machine.msId!,
            type,
            createdAt: new Date()
        });

        console.log(`[HARDWARE SYNC] ${empCode} -> ${type} on ${machine.msId}`);
    } catch (e) {
        console.error(`[HARDWARE ERROR] Failed to ${type} ${empCode} on ${machine.msId}:`, e);
    }
}