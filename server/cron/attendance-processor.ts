// import { db } from "../db";
// import {
//     people,
//     employeeActivityLogs,
//     dailyAttendanceSummary,
//     doors,
//     doorDevices,
//     shifts
// } from "@shared/schema";
// import { eq, sql } from "drizzle-orm";
// import { ZONES, ATTENDANCE_STATUS } from "../constant";
// import dayjs from "dayjs";
// import isBetween from "dayjs/plugin/isBetween";
// import customParseFormat from "dayjs/plugin/customParseFormat";

// dayjs.extend(isBetween);
// dayjs.extend(customParseFormat);

// export async function processAttendanceBatch(rawPunches: any[]) {
//     const activityLogsToInsert: any[] = [];

//     const [allDoorMappings, allShifts] = await Promise.all([
//         db.select({
//             doorId: doors.id,
//             doorName: doors.name,
//             inDeviceIds: doorDevices.inDeviceIds,
//             outDeviceIds: doorDevices.outDeviceIds,
//             isMainGate: doorDevices.isMainGate,
//         }).from(doors).leftJoin(doorDevices, eq(doors.id, doorDevices.doorId)),
//         db.select().from(shifts)
//     ]);

//     for (const punch of rawPunches) {
//         try {
//             const msEmpCode = String(punch.EmployeeCode || "");
//             const msDeviceId = Number(punch.DeviceId);
//             const punchTime = dayjs(punch.TransactionStamp || punch.LogDate);
//             const onlyDate = punchTime.format('YYYY-MM-DD');

//             if (!msEmpCode) continue;

//             const [emp] = await db.select().from(people).where(eq(people.employeeCode, msEmpCode)).limit(1);
//             if (!emp) continue;

//             const mapping = allDoorMappings.find(m =>
//                 m.inDeviceIds?.includes(msDeviceId) || m.outDeviceIds?.includes(msDeviceId)
//             );
//             if (!mapping) continue;

//             const isIncoming = mapping.inDeviceIds?.includes(msDeviceId);
//             const direction = isIncoming ? "IN" : "OUT";

//             // FIXED: Using thresholdMins as per your schema
//             let detectedShift = null;
//             if (direction === "IN") {
//                 for (const s of allShifts) {
//                     const shiftStart = dayjs(`${onlyDate} ${s.startTime}`, "YYYY-MM-DD HH:mm");
//                     const threshold = s.thresholdMins || 30; // Changed from lateThresholdMins

//                     if (punchTime.isBetween(shiftStart.subtract(threshold, 'm'), shiftStart.add(threshold, 'm'), null, '[]')) {
//                         detectedShift = s;
//                         break;
//                     }
//                 }
//             }

//             const lastSeen = emp.lastSeenTime ? dayjs(emp.lastSeenTime) : punchTime;
//             const durationMinutes = Math.max(0, punchTime.diff(lastSeen, 'minute'));
//             const isProductive = emp.currentZone === ZONES.CABIN;
//             let nextZone = mapping.isMainGate ? (direction === "OUT" ? ZONES.OUT : ZONES.IN) : ZONES.CABIN;

//             activityLogsToInsert.push({
//                 deviceLogId: punch.DeviceLogId,
//                 employeeCode: msEmpCode,
//                 employeeName: emp.employeeName,
//                 doorName: mapping.doorName,
//                 direction: direction,
//                 logDate: punchTime.toDate(),
//                 onlyDate: onlyDate,
//                 stayDurationMinutes: durationMinutes,
//                 currentZone: nextZone,
//                 shiftId: detectedShift?.id || null, // Logs mein save hoga
//                 isProductive: isProductive,
//             });

//             // FIXED: Removed currentShiftId update because it's missing in people table
//             await db.update(people).set({
//                 lastSeenTime: punchTime.toDate(),
//                 currentZone: nextZone,
//                 updatedAt: new Date()
//             }).where(eq(people.employeeCode, msEmpCode));

//             await updateSummaryWithOT(
//                 msEmpCode,
//                 onlyDate,
//                 punchTime.toDate(),
//                 durationMinutes,
//                 isProductive,
//                 detectedShift || { fullDayHours: 8.5 }
//             );

//         } catch (err) {
//             console.error(`❌ Sync Error:`, err);
//         }
//     }

//     if (activityLogsToInsert.length > 0) {
//         await db.insert(employeeActivityLogs).values(activityLogsToInsert).onConflictDoNothing();
//     }
// }

// async function updateSummaryWithOT(empCode: string, date: string, punchTime: Date, minutes: number, isProductive: boolean, shift: any) {
//     const standardMins = (shift.fullDayHours || 8.5) * 60;

//     await db.insert(dailyAttendanceSummary)
//         .values({
//             employeeCode: empCode,
//             workDate: date,
//             productiveMinutes: isProductive ? minutes : 0,
//             totalOfficeMinutes: minutes,
//             attendanceStatus: ATTENDANCE_STATUS.PRESENT
//         })
//         .onConflictDoUpdate({
//             target: [dailyAttendanceSummary.workDate, dailyAttendanceSummary.employeeCode],
//             set: {
//                 productiveMinutes: sql`${dailyAttendanceSummary.productiveMinutes} + ${isProductive ? minutes : 0}`,
//                 totalOfficeMinutes: sql`${dailyAttendanceSummary.totalOfficeMinutes} + ${minutes}`,
//                 // Note: overtimeMinutes field check karein schema mein, agar error aaye toh ise comment kar dein
//                 // overtimeMinutes: sql`CASE WHEN (${dailyAttendanceSummary.totalOfficeMinutes} + ${minutes}) > ${standardMins} THEN (${dailyAttendanceSummary.totalOfficeMinutes} + ${minutes}) - ${standardMins} ELSE 0 END`,
//                 lastOut: punchTime
//             }
//         });
// }