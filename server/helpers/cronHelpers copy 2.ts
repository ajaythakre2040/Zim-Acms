import { db } from "../db";
import { people, blockUnblockLogs } from "@shared/schema"; // Purana schema use kiya
import { eq, and, desc, sql } from "drizzle-orm";
import { esslService } from "../services/essl-service"; // Aapki existing service
import { ZONES } from "../constant";

/**
 * Hardware Sync Logic: Purane blockUnblockLogs ke logic ke saath
 */
export async function updateDeviceStatus(empCode: string, machine: any, shouldBlock: boolean) {
    const type = shouldBlock ? "block" : "unblock";
    const machineId = machine.msId ?? 0;

    try {
        // Redundancy Check: Baar-baar hardware call se bachne ke liye
        const lastLog = await db.query.blockUnblockLogs.findFirst({
            where: and(
                eq(blockUnblockLogs.employeeCode, empCode),
                eq(blockUnblockLogs.deviceId, machineId)
            ),
            orderBy: [desc(blockUnblockLogs.createdAt)]
        });

        if (lastLog && lastLog.type === type) return;

        if (!machine.serialNumber) return;

        // ACTUAL HARDWARE COMMAND
        await esslService.syncUserBlockStatus(empCode, machine.serialNumber.trim(), shouldBlock);

        // Success Entry in DB
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
 * Aaj ke active employees check karne ke liye helper
 * (Aapke purane hasEnteredToday ka refined version)
 */
export function isUserActiveToday(emp: any, todayStart: Date): boolean {
    if (!emp || !emp.lastSeenTime) return false;
    const lastSeen = new Date(emp.lastSeenTime);
    return lastSeen >= todayStart && emp.currentZone !== ZONES.OUT;
}
export async function syncEmployeeHardware(
    empCode: string,
    allDevices: any[],
    allDoorDevices: any[],
    assignment: any,
    isLockoutActive: boolean = false,
    lockoutDoorId: number | null = null
) {
    const allowedDoorIds = Array.isArray(assignment?.doorIds) ? assignment.doorIds.map(Number) : [];

    for (const machine of allDevices) {
        const doorDeviceMapping = allDoorDevices.find(dd =>
            [...(dd.inDeviceIds || []), ...(dd.outDeviceIds || [])].map(Number).includes(Number(machine.msId))
        );

        if (!doorDeviceMapping) continue;
        const currentMachineDoorId = Number(doorDeviceMapping.doorId);

        let shouldBlock = true;

        // Agar lockout active hai toh sirf wahi door khulega jisme wo band hai
        if (isLockoutActive && lockoutDoorId) {
            shouldBlock = (currentMachineDoorId !== lockoutDoorId);
        } else {
            // Normal case: Agar door user ko assigned hai toh unblock (false), nahi toh block (true)
            shouldBlock = !allowedDoorIds.includes(currentMachineDoorId);
        }

        await updateDeviceStatus(empCode, machine, shouldBlock);
    }
}