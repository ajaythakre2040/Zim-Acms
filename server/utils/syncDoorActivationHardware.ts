import { db } from "../db";
import {
  devices,
  doorDevices,
  people,
  doors,
  employeeDoorAssignments,
  cabinLockouts
} from "@shared/schema";
import { eq, and, gt, inArray, sql } from "drizzle-orm";
import { ZONES, MAIN_GATE_SYNC } from "../constant";
import * as helpers from "../helpers/cronHelpers";

/**
 * Door Activated hone par Cron Rules ke accoding Active (IN) employees 
 * ka Hardware Re-Sync karta hai.
 */
export async function syncDoorActivationHardware(targetDoorId: number): Promise<number> {
  const now = new Date();

  // 1. Activated Door & Active Devices Fetch Karein
  const [targetDoor] = await db
    .select()
    .from(doors)
    .where(and(eq(doors.id, targetDoorId), eq(doors.isActive, true)))
    .limit(1);

  if (!targetDoor) {
    console.log(`[Door Activation Sync] Target Door ${targetDoorId} active nahi hai ya exist nahi karta.`);
    return 0;
  }

  // Target door se mapped Active Hardware Devices fetch karein
  const activeDoorDevices = await db
    .select()
    .from(doorDevices)
    .where(and(eq(doorDevices.doorId, targetDoorId), eq(doorDevices.isActive, true)));

  if (activeDoorDevices.length === 0) {
    console.log(`[Door Activation Sync] Door ${targetDoorId} par koi active hardware devices mapped nahi hain.`);
    return 0;
  }

  // Active Devices Master details fetch karein
  const mappedDeviceIds = activeDoorDevices.flatMap((d) => [
    ...(d.inDeviceIds || []),
    ...(d.outDeviceIds || []),
  ]).map(Number);

  if (mappedDeviceIds.length === 0) return 0;

  const targetDevices = await db
    .select()
    .from(devices)
    .where(
      and(
        gt(devices.msId, 0),
        eq(devices.isActive, true),
        inArray(devices.msId, mappedDeviceIds)
      )
    );

  if (targetDevices.length === 0) return 0;

  // 2. Sirf un logon ko fetch karein jo currently "IN" ya "CABIN" Zone me hain
  const activeInsidePeople = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.status, "active"),
        inArray(people.currentZone, [ZONES.IN, ZONES.CABIN])
      )
    );

  if (activeInsidePeople.length === 0) {
    console.log(`[Door Activation Sync] Inside campus (IN/CABIN) koi active employees nahi mile.`);
    return 0;
  }

  const activeEmpCodes = activeInsidePeople.map((p) => p.employeeCode).filter(Boolean) as string[];

  // 3. User Assignments & Active Lockouts Parallel Fetch
  const [assignments, activeLockouts] = await Promise.all([
    db
      .select()
      .from(employeeDoorAssignments)
      .where(inArray(employeeDoorAssignments.employeeCode, activeEmpCodes)),
    db
      .select()
      .from(cabinLockouts)
      .where(
        and(
          inArray(cabinLockouts.employeeCode, activeEmpCodes),
          eq(cabinLockouts.status, "active"),
          gt(cabinLockouts.lockoutExpiry, now)
        )
      ),
  ]);

  const isTargetMainGate = targetDoor.code === MAIN_GATE_SYNC.CODE;
  let syncedEmployeesCount = 0;

  // 4. Cron Matrix Sync Loop
  for (const person of activeInsidePeople) {
    const empCode = person.employeeCode;
    if (!empCode) continue;

    const userLockout = activeLockouts.find((l) => l.employeeCode === empCode);
    const assignment = assignments.find((a) => a.employeeCode === empCode);
    const normalAllowedIds = Array.isArray(assignment?.doorIds)
      ? assignment.doorIds.map(Number)
      : [];

    let shouldBlock = true;

    // --- Exact Cron Matrix Logic ---
    if (person.currentZone === ZONES.CABIN) {
      // Zone: CABIN (Sirf usi cabin ke door par unblock hoga)
      // Note: `lastPunchDoorId` se verify kar sakte hain
      shouldBlock = Number(person.lastPunchDoorId) !== Number(targetDoorId);
    } else if (person.currentZone === ZONES.IN) {
      // Zone: IN (Building Campus Inside)
      if (isTargetMainGate) {
        shouldBlock = false; // Main Gate par IN rehne par always Unblocked
      } else {
        shouldBlock = userLockout
          ? Number(targetDoorId) !== Number(userLockout.doorId)
          : !normalAllowedIds.includes(Number(targetDoorId));
      }
    }

    // Activated Door Devices par Hardware status push karein
    for (const machine of targetDevices) {
      try {
        await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
      } catch (err) {
        console.error(
          `[Door Activation Hardware Error] Sync fail for ${empCode} on device ${machine.msId}:`,
          err
        );
      }
    }

    syncedEmployeesCount++;
  }

  return syncedEmployeesCount;
}




// export async function syncDoorActivationHardware(targetDoorId: number): Promise<number> {
//     const now = new Date();

//     // Target door fetch
//     const [targetDoor] = await db
//         .select()
//         .from(doors)
//         .where(and(eq(doors.id, targetDoorId), eq(doors.isActive, true)))
//         .limit(1);

//     if (!targetDoor) return 0;

//     const isTargetUnit1 = helpers.isUnit1Door(targetDoor.unit); // Unit 1 Check
//     const isTargetMainGate = targetDoor.code === MAIN_GATE_SYNC.CODE;

//     // Agar door UNIT_1 nahi hai, toh hum OUT / IN dono zone ke employees ke liye sync query chalayenge
//     const zoneCondition = isTargetUnit1
//         ? inArray(people.currentZone, [ZONES.IN, ZONES.CABIN])
//         : inArray(people.currentZone, [ZONES.IN, ZONES.CABIN, ZONES.OUT]);

//     const activePeople = await db
//         .select()
//         .from(people)
//         .where(and(eq(people.status, "active"), zoneCondition));

//     if (activePeople.length === 0) return 0;

//     const activeEmpCodes = activePeople.map((p) => p.employeeCode).filter(Boolean) as string[];

//     const [assignments, activeLockouts, activeDoorDevices] = await Promise.all([
//         db.select().from(employeeDoorAssignments).where(inArray(employeeDoorAssignments.employeeCode, activeEmpCodes)),
//         db.select().from(cabinLockouts).where(and(inArray(cabinLockouts.employeeCode, activeEmpCodes), eq(cabinLockouts.status, "active"), gt(cabinLockouts.lockoutExpiry, now))),
//         db.select().from(doorDevices).where(and(eq(doorDevices.doorId, targetDoorId), eq(doorDevices.isActive, true)))
//     ]);

//     const mappedDeviceIds = activeDoorDevices.flatMap((d) => [
//         ...(d.inDeviceIds || []),
//         ...(d.outDeviceIds || []),
//     ]).map(Number);

//     if (mappedDeviceIds.length === 0) return 0;

//     const targetDevices = await db
//         .select()
//         .from(devices)
//         .where(and(gt(devices.msId, 0), eq(devices.isActive, true), inArray(devices.msId, mappedDeviceIds)));

//     let syncedEmployeesCount = 0;

//     for (const person of activePeople) {
//         const empCode = person.employeeCode;
//         if (!empCode) continue;

//         const userLockout = activeLockouts.find((l) => l.employeeCode === empCode);
//         const assignment = assignments.find((a) => a.employeeCode === empCode);
//         const normalAllowedIds = Array.isArray(assignment?.doorIds) ? assignment.doorIds.map(Number) : [];

//         let shouldBlock = true;

//         if (!isTargetUnit1 && person.currentZone === ZONES.OUT) {
//             // Non-UNIT_1 doors: OUT rehne par bhi normal assignment follow karega
//             shouldBlock = userLockout
//                 ? Number(targetDoorId) !== Number(userLockout.doorId)
//                 : !normalAllowedIds.includes(Number(targetDoorId));
//         } else if (person.currentZone === ZONES.CABIN) {
//             shouldBlock = Number(person.lastPunchDoorId) !== Number(targetDoorId);
//         } else if (person.currentZone === ZONES.IN) {
//             if (isTargetMainGate) {
//                 shouldBlock = false;
//             } else {
//                 shouldBlock = userLockout
//                     ? Number(targetDoorId) !== Number(userLockout.doorId)
//                     : !normalAllowedIds.includes(Number(targetDoorId));
//             }
//         }

//         for (const machine of targetDevices) {
//             try {
//                 await helpers.updateDeviceStatus(empCode, machine, shouldBlock);
//             } catch (err) {
//                 console.error(`Sync fail for ${empCode} on device ${machine.msId}:`, err);
//             }
//         }
//         syncedEmployeesCount++;
//     }

//     return syncedEmployeesCount;
// }