import { db } from "../db";
import {
    people,
    employeeActivityLogs,
    dailyAttendanceSummary,
    doors,
    doorDevices,
    shifts,
    departments,
    devices,
    designations,
} from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { ZONES, ATTENDANCE_STATUS, ATTENDANCE_CONFIG } from "../constant";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Plugins Initialize
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Kolkata";

export async function processAttendanceBatch(rawPunches: any[]) {
    if (!rawPunches.length) return;

    // 1. Meta Data Fetch
    const [allDoorMappings, allShifts] = await Promise.all([
        db.select({
            doorId: doors.id,
            doorName: doors.name,
            inDeviceIds: doorDevices.inDeviceIds,
            outDeviceIds: doorDevices.outDeviceIds,
        }).from(doors).leftJoin(doorDevices, eq(doors.id, doorDevices.doorId)),
        db.select().from(shifts).where(eq(shifts.isActive, true)),
    ]);

    const shiftWindows = allShifts.map((s) => {
        const [h, m] = (s.startTime || "00:00").split(":");
        return (punchTime: dayjs.Dayjs) => {
            const shiftStartTime = punchTime.clone().tz(TZ)
                .set("hour", parseInt(h))
                .set("minute", parseInt(m))
                .set("second", 0);
            const buffer = s.thresholdMins ?? 30;
            return {
                name: s.name,
                shiftTime: `${s.startTime} - ${s.endTime}`,
                workingHours: s.workingHours || 8,
                windows: [{
                    start: shiftStartTime.subtract(buffer, "minute"),
                    end: shiftStartTime.add(buffer, "minute"),
                }],
            };
        };
    });

    const allDevices = await db.select().from(devices);
    const activityLogsToInsert: any[] = [];

    // 2. Loop through Punches
    for (const punch of rawPunches) {
        try {
            const msEmpCode = String(punch.EmployeeCode || punch.employeecode || "");
            const msDeviceId = Number(punch.DeviceId || punch.deviceid || 0);

            const device = allDevices.find((d) => Number(d.msId) === msDeviceId);
            if (!device) continue;

            const rawTime = punch.LogDate || punch.logdate || punch.TransactionStamp;

            // ✅ Timezone Fix: India local time parse karein
            const punchTime = typeof rawTime === "string"
                ? dayjs.tz(rawTime.replace("Z", ""), TZ)
                : dayjs.tz(rawTime, TZ);

            const onlyDate = punchTime.format("YYYY-MM-DD");
            const localTimestamp = punchTime.format("YYYY-MM-DD HH:mm:ss");

            if (!msEmpCode || msDeviceId === 0 || !punchTime.isValid()) continue;

            const [empData] = await db.select({
                id: people.id,
                employeeName: people.employeeName,
                deptName: departments.name,
                desigName: designations.name,
                lastSeenTime: people.lastSeenTime,
                currentZone: people.currentZone,
                gender: people.gender,
            }).from(people)
                .leftJoin(departments, eq(people.departmentId, departments.id))
                .leftJoin(designations, eq(people.designationId, designations.id))
                .where(eq(people.employeeCode, msEmpCode)).limit(1);

            if (!empData) continue;

            const mapping = allDoorMappings.find(m =>
                m.inDeviceIds?.includes(msDeviceId) || m.outDeviceIds?.includes(msDeviceId)
            );

            let isIncoming = device.deviceDirection === "IN";
            const [existing] = await db.select().from(dailyAttendanceSummary)
                .where(and(eq(dailyAttendanceSummary.employeeCode, msEmpCode), eq(dailyAttendanceSummary.workDate, onlyDate)));

            if (!existing && !isIncoming) isIncoming = true;

            const direction = isIncoming ? "IN" : "OUT";
            const doorName = mapping?.doorName || device.name;
            const doorId = mapping?.doorId || device.id;

            let detShiftName = "-";
            let detShiftTime = "N/A";
            let detWorkingHours = 8;

            if (isIncoming) {
                outerLoop: for (const getWindow of shiftWindows) {
                    const win = getWindow(punchTime);
                    for (const w of win.windows) {
                        if (punchTime.isBetween(w.start, w.end, null, "[]")) {
                            detShiftName = win.name;
                            detShiftTime = win.shiftTime;
                            detWorkingHours = win.workingHours;
                            break outerLoop;
                        }
                    }
                }
            }

            const zoneLabel = `${doorName} ${direction}`;
            const lastSeen = empData.lastSeenTime ? dayjs(empData.lastSeenTime).tz(TZ) : punchTime;
            const durationMinutes = lastSeen.isSame(punchTime, "day") ? Math.max(0, punchTime.diff(lastSeen, "minute")) : 0;

            // ✅ Log Activity for Bulk Insert
            activityLogsToInsert.push({
                deviceLogId: Number(punch.DeviceLogId || punch.devicelogid || Date.now()), // FIXED: Number type
                employeeCode: msEmpCode,
                employeeName: empData.employeeName,
                deviceId: msDeviceId,
                deviceName: device.name,
                doorId: Number(doorId), // FIXED: Number type
                doorName: doorName,
                direction: direction,
                logDate: sql`${localTimestamp}::timestamp` as any, // FIXED: Bypass toISOString
                onlyDate: onlyDate,
                stayDurationMinutes: durationMinutes,
                departmentName: empData.deptName || "N/A",
                designationName: empData.desigName || "N/A",
                isProductive: isIncoming,
                prevZone: empData.currentZone || "Unknown",
                currentZone: zoneLabel,
                shiftName: detShiftName,
                shiftTime: detShiftTime,
            });

            // 3. Update People & Summary
            await db.transaction(async (tx) => {
                await tx.execute(sql`
                    UPDATE people 
                    SET last_seen_time = ${localTimestamp}::timestamp, 
                        current_zone = ${isIncoming ? ZONES.IN : ZONES.OUT},
                        updated_at = NOW()
                    WHERE employee_code = ${msEmpCode}
                `);

                await updateSummaryWithOT(
                    tx, msEmpCode, empData.employeeName, onlyDate, localTimestamp,
                    durationMinutes, isIncoming, detWorkingHours * 60, empData.deptName || "N/A",
                    empData.desigName || "N/A", empData.gender || "N/A", zoneLabel,
                    detShiftName, detShiftTime
                );
            });
        } catch (err: any) {
            console.error(`❌ Sync Error for ${punch.EmployeeCode}: ${err.message}`);
        }
    }

    // 4. Bulk Insert Activity Logs
    if (activityLogsToInsert.length > 0) {
        await db.insert(employeeActivityLogs).values(activityLogsToInsert).onConflictDoNothing();
    }
}

async function updateSummaryWithOT(
    tx: any, empCode: string, employeeName: string, date: string, punchStr: string,
    mins: number, isIncoming: boolean, shiftMinutes: number, dept: string,
    desig: string, gender: string, door: string, sName: string, sTime: string
) {
    const [existing] = await tx.select().from(dailyAttendanceSummary)
        .where(and(eq(dailyAttendanceSummary.employeeCode, empCode), eq(dailyAttendanceSummary.workDate, date)));

    const finalShiftName = existing?.shiftname || sName;
    const finalShiftTime = existing?.shifttime || sTime;
    const totalOffice = (existing?.totalPresenceMinutes || 0) + mins;
    const productive = (existing?.productiveMinutes || 0) + (isIncoming ? mins : 0);

    const extra = totalOffice > shiftMinutes ? totalOffice - shiftMinutes : 0;
    let finalOT = (extra >= (ATTENDANCE_CONFIG.OT_THRESHOLD_MINUTES || 120)) ? extra : 0;

    await tx.insert(dailyAttendanceSummary).values({
        employeeCode: empCode,
        employeeName: employeeName,
        workDate: date,
        firstIn: sql`${punchStr}::timestamp`, // FIXED: RAW SQL
        // lastOut: sql`${punchStr}::timestamp`, 
        totalPresenceMinutes: totalOffice,
        productiveMinutes: productive,
        overtimeMinutes: finalOT,
        totalPunches: 1,
        attendanceStatus: ATTENDANCE_STATUS.PRESENT,
        departmentName: dept,
        designationName: desig,
        gender: gender,
        doorName: door,
        shiftname: finalShiftName,
        shifttime: finalShiftTime,
    }).onConflictDoUpdate({
        target: [dailyAttendanceSummary.workDate, dailyAttendanceSummary.employeeCode],
        set: {
            lastOut: sql`${punchStr}::timestamp`,
            totalPresenceMinutes: totalOffice,
            productiveMinutes: productive,
            overtimeMinutes: finalOT,
            totalPunches: sql`${dailyAttendanceSummary.totalPunches} + 1`,
            doorName: door,
            employeeName: employeeName,
        },
    });
}