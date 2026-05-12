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

dayjs.extend(isBetween);

// ✅ same imports (no change)

export async function processAttendanceBatch(rawPunches: any[]) {
    if (!rawPunches.length) return;

    const [allDoorMappings, allShifts] = await Promise.all([
        db
            .select({
                doorId: doors.id,
                doorName: doors.name,
                inDeviceIds: doorDevices.inDeviceIds,
                outDeviceIds: doorDevices.outDeviceIds,
            })
            .from(doors)
            .leftJoin(doorDevices, eq(doors.id, doorDevices.doorId)),
        db.select().from(shifts).where(eq(shifts.isActive, true)),
    ]);

    // ✅ SHIFT WINDOW FIXED
    const shiftWindows = allShifts.map((s) => {
        const [h, m] = (s.startTime || "00:00").split(":");

        return (punchTime: dayjs.Dayjs) => {
            const shiftStartTime = punchTime
                .set("hour", parseInt(h))
                .set("minute", parseInt(m))
                .set("second", 0);

            const buffer = s.thresholdMins ?? 30;

            return {
                name: s.name,
                shiftTime: `${s.startTime} - ${s.endTime}`,
                workingHours: s.workingHours || 8,
                windows: [
                    {
                        start: shiftStartTime.subtract(buffer, "minute"),
                        end: shiftStartTime.add(buffer, "minute"),
                    },
                ],
            };
        };
    });

    const activityLogsToInsert: any[] = [];
    const allDevices = await db.select().from(devices);

    for (const punch of rawPunches) {
        try {
            const msEmpCode = String(punch.EmployeeCode || punch.employeecode || "");
            const msDeviceId = Number(punch.DeviceId || punch.deviceid || 0);

            const device = allDevices.find((d) => Number(d.msId) === msDeviceId);
            if (!device) continue;

            const rawTime = punch.LogDate || punch.logdate || punch.TransactionStamp;

            const punchTime =
                typeof rawTime === "string"
                    ? dayjs(rawTime.replace("Z", ""))
                    : dayjs(rawTime);

            const onlyDate = punchTime.format("YYYY-MM-DD");

            if (!msEmpCode || msDeviceId === 0 || !punchTime.isValid()) continue;

            const [empData] = await db
                .select({
                    id: people.id,
                    employeeName: people.employeeName,
                    deptName: departments.name,
                    desigName: designations.name,
                    lastSeenTime: people.lastSeenTime,
                    currentZone: people.currentZone,
                    gender: people.gender,
                })
                .from(people)
                .leftJoin(departments, eq(people.departmentId, departments.id))
                .leftJoin(designations, eq(people.designationId, designations.id))
                .where(eq(people.employeeCode, msEmpCode))
                .limit(1);

            if (!empData) continue;

            // 🔥 OLD mapping fallback (maintained)
            const mapping = allDoorMappings.find(
                (m) =>
                    m.inDeviceIds?.includes(msDeviceId) ||
                    m.outDeviceIds?.includes(msDeviceId),
            );

            // ✅ NEW PRIMARY LOGIC
            let isIncoming = device.deviceDirection === "IN";

            // ✅ fallback: agar direction missing ho ya first punch OUT ho
            const [existing] = await db
                .select()
                .from(dailyAttendanceSummary)
                .where(
                    and(
                        eq(dailyAttendanceSummary.employeeCode, msEmpCode),
                        eq(dailyAttendanceSummary.workDate, onlyDate),
                    ),
                );

            if (!existing && !isIncoming) {
                isIncoming = true; // first punch always IN
            }

            const direction = isIncoming ? "IN" : "OUT";

            // ✅ door fallback
            const doorName = mapping?.doorName || device.name;
            const doorId = mapping?.doorId || device.id;

            let detectedShiftName = "General";
            let detectedShiftTime = "N/A";
            let detectedWorkingHours = 8;

            if (isIncoming) {
                outerLoop: for (const getWindow of shiftWindows) {
                    const win = getWindow(punchTime);

                    for (const w of win.windows) {
                        if (punchTime.isBetween(w.start, w.end, null, "[]")) {
                            detectedShiftName = win.name;
                            detectedShiftTime = win.shiftTime;
                            detectedWorkingHours = win.workingHours;
                            break outerLoop; // 🔥 VERY IMPORTANT
                        }
                    }
                }
            }

            const zoneLabel = `${doorName} ${isIncoming ? "In" : "Out"}`;
            const prevZone = empData.currentZone || "Unknown";
            const currentZone = isIncoming ? ZONES.IN : ZONES.OUT;

            const shiftMinutes = detectedWorkingHours * 60;

            const lastSeen = empData.lastSeenTime
                ? dayjs(empData.lastSeenTime)
                : punchTime;

            const durationMinutes = lastSeen.isSame(punchTime, "day")
                ? Math.max(0, punchTime.diff(lastSeen, "minute"))
                : 0;

            activityLogsToInsert.push({
                deviceLogId: String(
                    punch.DeviceLogId ||
                    punch.devicelogid ||
                    `${Date.now()}-${Math.random()}`,
                ),
                employeeCode: msEmpCode,
                employeeName: empData.employeeName,
                deviceId: msDeviceId,
                deviceName: device.name,
                doorId: doorId,
                doorName: doorName,
                direction: direction,
                logDate: punchTime.toDate(),
                onlyDate: onlyDate,
                stayDurationMinutes: durationMinutes,
                departmentName: empData.deptName || "N/A",
                designationName: empData.desigName || "N/A",
                isProductive: isIncoming,
                prevZone: prevZone,
                currentZone: zoneLabel,
            });

            await db.transaction(async (tx) => {
                await tx
                    .update(people)
                    .set({
                        lastSeenTime: punchTime.toDate(),
                        currentZone: currentZone,
                        updatedAt: new Date(),
                    })
                    .where(eq(people.employeeCode, msEmpCode));

                await updateSummaryWithOT(
                    tx,
                    msEmpCode,
                    empData.employeeName,
                    onlyDate,
                    punchTime.toDate(),
                    durationMinutes,
                    isIncoming,
                    shiftMinutes,
                    empData.deptName || "N/A",
                    empData.desigName || "N/A",
                    empData.gender || "N/A",
                    zoneLabel,
                    detectedShiftName,
                    detectedShiftTime,
                    null,

                );
            });
        } catch (err: any) {
            console.error(`❌ Sync Error: ${err.message}`);
        }
    }

    if (activityLogsToInsert.length > 0) {
        await db
            .insert(employeeActivityLogs)
            .values(activityLogsToInsert)
            .onConflictDoNothing();
    }
}
async function updateSummaryWithOT(
    tx: any,
    empCode: string,
    employeeName: string,
    date: string,
    punchTime: Date,
    mins: number,
    isIncoming: boolean,
    shiftMinutes: number,
    departmentName: string,
    designationName: string,
    gender: string,
    doorInfo: string,
    shiftName: string,
    shiftStart: any,
    shiftEnd: any,
) {
    const [existing] = await tx
        .select()
        .from(dailyAttendanceSummary)
        .where(
            and(
                eq(dailyAttendanceSummary.employeeCode, empCode),
                eq(dailyAttendanceSummary.workDate, date),
            ),
        );
    const finalShiftName = existing?.shiftname || shiftName || "General";

    const finalShiftTime = existing?.shifttime || shiftStart || "N/A";
    const totalOffice = (existing?.totalOfficeMinutes || 0) + mins;
    const productive =
        (existing?.productiveMinutes || 0) + (isIncoming ? mins : 0);

    // 🔥 DYNAMIC OT LOGIC
    const extraMinutes =
        totalOffice > shiftMinutes ? totalOffice - shiftMinutes : 0;

    // Eligibility: 2 hours (120 mins) threshold check
    let finalOvertime = 0;
    if (extraMinutes >= ATTENDANCE_CONFIG.OT_THRESHOLD_MINUTES) {
        finalOvertime = extraMinutes;
    }

    await tx
        .insert(dailyAttendanceSummary)
        .values({
            employeeCode: empCode,
            employeeName: employeeName,
            workDate: date,
            firstIn: punchTime,
            lastOut: punchTime,
            totalOfficeMinutes: totalOffice,
            productiveMinutes: productive,
            overtimeMinutes: finalOvertime,
            totalPunches: 1,
            attendanceStatus: ATTENDANCE_STATUS.PRESENT,
            departmentName,
            designationName,
            gender,
            doorName: doorInfo,
            shiftname: finalShiftName,
            shifttime: finalShiftTime || "N/A",
        })
        .onConflictDoUpdate({
            target: [
                dailyAttendanceSummary.workDate,
                dailyAttendanceSummary.employeeCode,
            ],
            set: {
                lastOut: punchTime,
                totalOfficeMinutes: totalOffice,
                productiveMinutes: productive,
                overtimeMinutes: finalOvertime,
                totalPunches: sql`${dailyAttendanceSummary.totalPunches} + 1`,
                departmentName: departmentName,
                designationName: designationName,
                gender: gender,
                doorName: doorInfo,
                shiftname: finalShiftName,
                shifttime: finalShiftTime || "N/A",
                employeeName: employeeName,
            },
        });
}
