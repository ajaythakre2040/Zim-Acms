import { db } from "../db";
import { people, blockUnblockLogs, visitorMaster } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { esslService } from "../services/essl-service";
import { UNIT_TYPE, VISITOR_PREFIX, ZONES } from "../constant";

/**
 * Hardware Sync Logic: Block ya Unblock command bhejta hai
 */
export async function updateDeviceStatus(empCode: string, machine: any, shouldBlock: boolean) {
    // Safety check: Agar empCode galti se null ya empty aaye toh execute na karein
    if (!empCode) return;

    const type = shouldBlock ? "block" : "unblock";
    const machineId = machine.msId ?? 0;

    try {
        // 1. Redundancy Check: Taki baar-baar hardware ko same command na jaye
        const lastLog = await db.query.blockUnblockLogs.findFirst({
            where: and(
                eq(blockUnblockLogs.employeeCode, empCode),
                eq(blockUnblockLogs.deviceId, machineId)
            ),
            orderBy: [desc(blockUnblockLogs.createdAt)]
        });

        // Agar pichla status bhi wahi tha jo ab bhej rahe hain, toh skip karein
        if (lastLog && lastLog.type === type) return;

        if (!machine.serialNumber) {
            console.warn(`[SYNC SKIP] No serial number for Machine ${machineId}`);
            return;
        }

        // 2. ACTUAL HARDWARE COMMAND (eSSL Service call)
        await esslService.syncUserBlockStatus(empCode, machine.serialNumber.trim(), shouldBlock);

        // 3. Success Entry in DB
        await db.insert(blockUnblockLogs).values({
            employeeCode: empCode,
            deviceId: machineId,
            type,
            createdAt: new Date()
        });

    } catch (e) {
        console.error(`[SYNC ERROR] ${empCode} on Machine ${machineId}:`, e);
    }
}

/**
 * Multiple Devices ko ek saath sync karne ke liye helper
 */
export async function syncEmployeeHardware(
    empCode: string, // Yahan main cron se (person.employeeCode ?? "") bhejenge
    allDevices: any[],
    allDoorDevices: any[],
    assignment: any,
    isLockoutActive: boolean = false,
    lockoutDoorId: number | null = null
) {
    // Agar empCode null ya undefined hai toh loop chalane ka koi fayda nahi
    if (!empCode) return;

    const allowedDoorIds = Array.isArray(assignment?.doorIds) ? assignment.doorIds.map(Number) : [];

    for (const machine of allDevices) {
        // Mapping check: Ye machine kis door se judi hai?
        const doorDeviceMapping = allDoorDevices.find(dd =>
            [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])].map(Number).includes(Number(machine.msId))
        );

        if (!doorDeviceMapping) continue;

        const currentMachineDoorId = Number(doorDeviceMapping.doorId);
        let shouldBlock = true;

        // --- Logic: Block/Unblock Decision ---
        if (isLockoutActive && lockoutDoorId) {
            // Lockout case: Sirf wahi door unblock hoga jisme lockout hua hai
            shouldBlock = (currentMachineDoorId !== lockoutDoorId);
        } else {
            // Normal case: Agar assignment mein door hai toh unblock (false), nahi toh block (true)
            shouldBlock = !allowedDoorIds.includes(currentMachineDoorId);
        }

        // Final Hardware call
        await updateDeviceStatus(empCode, machine, shouldBlock);
    }
}

/**
 * Check if User is active today
 */
export function isUserActiveToday(emp: any, todayStart: Date): boolean {
    if (!emp || !emp.lastSeenTime) return false;
    const lastSeen = new Date(emp.lastSeenTime);
    return lastSeen >= todayStart && emp.currentZone !== ZONES.OUT;
}

/**
 * Check karta hai ki door Unit 1 ka hai ya nahi.
 * Unit 1 doors ke liye Main Gate IN punch compulsory hai.
 */
export function isUnit1Door(doorUnit?: string | null): boolean {
    if (!doorUnit) return false;
    return doorUnit.trim().toUpperCase() === UNIT_TYPE.UNIT_1.toUpperCase();
}

// =========================================================================
// 🚀 NEW VISITOR HELPERS ADDED BELOW (Naye Visitor Functions)
// =========================================================================

export interface VisitorPunchSyncParams {
    empCode: string;
    punchTime: Date;
    doorId: number;
    ruleId: number;
}

/**
 * 1. Prefix ("zimvis") se identify karega ki code Visitor ka hai ya nahi
 */
export function isVisitorCode(code: string): boolean {
    return code.toLowerCase().startsWith(VISITOR_PREFIX.toLowerCase());
}

/**
 * 2. Incoming Batch me se sirf Visitors ka Data Fetch karega
 */
export async function getPunchingVisitors(codes: string[]) {
    const visitorCodes = codes.filter(isVisitorCode);
    if (visitorCodes.length === 0) return [];

    return await db.select().from(visitorMaster).where(inArray(visitorMaster.employeeCode, visitorCodes));
}

/**
 * 3. Visitor Table (`visitorMaster`) me details Update karega
 */
export async function handleVisitorPunchUpdate({ empCode, punchTime, doorId, ruleId }: VisitorPunchSyncParams): Promise<void> {
    await db.update(visitorMaster).set({
        lastSeenTime: punchTime,
        lastPunchDoorId: doorId,
        ruleid: ruleId,
        updatedAt: new Date()
    }).where(eq(visitorMaster.employeeCode, empCode));
}