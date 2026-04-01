import { db } from "../db";
import { people, blockUnblockLogs, cabinLockouts } from "@shared/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { esslService } from "../essl-service";

export function hasValidRole(emp: any): boolean {
    return emp && emp.roleId !== null && emp.roleId !== undefined;
}

export async function getLockoutStatus(empCode: string) {
    return await db.query.cabinLockouts.findFirst({
        where: and(
            eq(cabinLockouts.employeeCode, empCode),
            eq(cabinLockouts.status, "active"),
            gt(cabinLockouts.lockoutExpiry, new Date())
        )
    });
}

export async function updateDeviceStatus(empCode: string, machine: any, shouldBlock: boolean) {
    const type = shouldBlock ? "block" : "unblock";
    const [lastLog] = await db.select().from(blockUnblockLogs)
        .where(and(
            eq(blockUnblockLogs.employeeCode, empCode),
            eq(blockUnblockLogs.deviceId, machine.msId!)
        ))
        .orderBy(desc(blockUnblockLogs.createdAt)).limit(1);

    if (lastLog && lastLog.type === type) return;

    try {
        await esslService.syncUserBlockStatus(empCode, machine.serialNumber!.trim(), shouldBlock);
        await db.insert(blockUnblockLogs).values({
            employeeCode: empCode,
            deviceId: machine.msId!,
            type,
            createdAt: new Date()
        });
    } catch (e) {
        console.error(`[HARDWARE ERROR] ${empCode}:`, e);
    }
}