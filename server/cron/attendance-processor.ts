import { db } from "../db";
import {
    people,
    employeeActivityLogs,
    dailyAttendanceSummary,
    doors,
    doorDevices,
    shifts,
    departments,
    designations
} from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { ZONES, ATTENDANCE_STATUS, ATTENDANCE_CONFIG } from "../constant";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

export async function processAttendanceBatch(rawPunches: any[]) {
    if (!rawPunches.length) return;

    // 1. Master Data Load
    const [allDoorMappings, allShifts] = await Promise.all([
        db.select({
            doorId: doors.id,
            doorName: doors.name,
            inDeviceIds: doorDevices.inDeviceIds,
            outDeviceIds: doorDevices.outDeviceIds,
        }).from(doors).leftJoin(doorDevices, eq(doors.id, doorDevices.doorId)),
        db.select().from(shifts).where(eq(shifts.isActive, true))
    ]);

    const activityLogsToInsert: any[] = [];

    for (const punch of rawPunches) {
        try {
            const msEmpCode = String(punch.EmployeeCode || punch.employeecode || "");
            const msDeviceId = Number(punch.DeviceId || punch.deviceid || 0);
            const msDeviceName = punch.DeviceName || punch.devicename || "Unknown Device";
            const punchTime = dayjs(punch.LogDate || punch.logdate || punch.TransactionStamp);
            const onlyDate = punchTime.format('YYYY-MM-DD');

            if (!msEmpCode || msDeviceId === 0 || !punchTime.isValid()) continue;

            // 2. Fetch Employee with Shift Data (Dynamic Working Hours ke liye)
            const [empData] = await db
                .select({
                    id: people.id,
                    employeeName: people.employeeName,
                    shiftId: people.shiftId,
                    deptName: departments.name,
                    desigName: designations.name,
                    lastSeenTime: people.lastSeenTime,
                    // Shift se working hours uthana
                    shiftWorkingHours: shifts.workingHours,
                })
                .from(people)
                .leftJoin(departments, eq(people.departmentId, departments.id))
                .leftJoin(designations, eq(people.designationId, designations.id))
                .leftJoin(shifts, eq(people.shiftId, shifts.id))
                .where(eq(people.employeeCode, msEmpCode))
                .limit(1);

            if (!empData) continue;

            const mapping = allDoorMappings.find(m =>
                m.inDeviceIds?.includes(msDeviceId) || m.outDeviceIds?.includes(msDeviceId)
            );
            if (!mapping) continue;

            const isIncoming = mapping.inDeviceIds?.includes(msDeviceId);
            const direction = isIncoming ? "IN" : "OUT";

            // 3. Dynamic Shift Calculation
            // Agar DB mein 8 likha hai toh 8 * 60 = 480 mins
            const shiftMinutes = (empData.shiftWorkingHours || 8) * 60;

            // 4. Stay Duration Logic
            const lastSeen = empData.lastSeenTime ? dayjs(empData.lastSeenTime) : punchTime;
            const durationMinutes = lastSeen.isSame(punchTime, 'day') ? Math.max(0, punchTime.diff(lastSeen, 'minute')) : 0;

            // 5. Activity Log Preparation
            activityLogsToInsert.push({
                deviceLogId: String(punch.DeviceLogId || punch.devicelogid || `${Date.now()}-${Math.random()}`),
                employeeCode: msEmpCode,
                employeeName: empData.employeeName,
                deviceId: msDeviceId,
                deviceName: msDeviceName,
                doorId: mapping.doorId,
                doorName: mapping.doorName,
                direction: direction,
                logDate: punchTime.toDate(),
                onlyDate: onlyDate,
                stayDurationMinutes: durationMinutes,
                shiftId: empData.shiftId,
                departmentName: empData.deptName || "N/A",
                designationName: empData.desigName || "N/A",
                isProductive: isIncoming,
            });

            // 6. Database Update with OT Logic
            await db.transaction(async (tx) => {
                await tx.update(people).set({
                    lastSeenTime: punchTime.toDate(),
                    currentZone: isIncoming ? ZONES.IN : ZONES.OUT,
                    updatedAt: new Date()
                }).where(eq(people.employeeCode, msEmpCode));

                await updateSummaryWithOT(tx, msEmpCode, onlyDate, punchTime.toDate(), durationMinutes, isIncoming ?? false, shiftMinutes);            });

        } catch (err: any) {
            console.error(`❌ Sync Error: ${err.message}`);
        }
    }

    if (activityLogsToInsert.length > 0) {
        await db.insert(employeeActivityLogs).values(activityLogsToInsert).onConflictDoNothing();
    }
}

async function updateSummaryWithOT(
    tx: any,
    empCode: string,
    date: string,
    punchTime: Date,
    mins: number,
    isIncoming: boolean,
    shiftMinutes: number
) {
    const [existing] = await tx.select()
        .from(dailyAttendanceSummary)
        .where(and(
            eq(dailyAttendanceSummary.employeeCode, empCode),
            eq(dailyAttendanceSummary.workDate, date)
        ));

    const totalOffice = (existing?.totalOfficeMinutes || 0) + mins;
    const productive = (existing?.productiveMinutes || 0) + (isIncoming ? mins : 0);

    // 🔥 DYNAMIC OT LOGIC
    const extraMinutes = totalOffice > shiftMinutes ? totalOffice - shiftMinutes : 0;

    // Eligibility: 2 hours (120 mins) threshold check
    let finalOvertime = 0;
    if (extraMinutes >= ATTENDANCE_CONFIG.OT_THRESHOLD_MINUTES) {
        finalOvertime = extraMinutes;
    }

    await tx.insert(dailyAttendanceSummary).values({
        employeeCode: empCode,
        workDate: date,
        firstIn: punchTime,
        lastOut: punchTime,
        totalOfficeMinutes: totalOffice,
        productiveMinutes: productive,
        overtimeMinutes: finalOvertime,
        totalPunches: 1,
        attendanceStatus: ATTENDANCE_STATUS.PRESENT,
    }).onConflictDoUpdate({
        target: [dailyAttendanceSummary.workDate, dailyAttendanceSummary.employeeCode],
        set: {
            lastOut: punchTime,
            totalOfficeMinutes: totalOffice,
            productiveMinutes: productive,
            overtimeMinutes: finalOvertime,
            totalPunches: sql`${dailyAttendanceSummary.totalPunches} + 1`
        }
    });
}