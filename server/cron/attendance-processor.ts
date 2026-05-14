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
import { eq, sql, and, asc } from "drizzle-orm";
import { ZONES, ATTENDANCE_STATUS, ATTENDANCE_CONFIG } from "../constant";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Kolkata";

export async function processAttendanceBatch(rawPunches: any[]) {
    if (!rawPunches.length) return;

    const [allDoorMappings, allShifts, allDevices] = await Promise.all([
        db.select({
            doorId: doors.id,
            doorName: doors.name,
            inDeviceIds: doorDevices.inDeviceIds,
            outDeviceIds: doorDevices.outDeviceIds,
        }).from(doors).leftJoin(doorDevices, eq(doors.id, doorDevices.doorId)),
        db.select().from(shifts).where(eq(shifts.isActive, true)),
        db.select().from(devices),
    ]);

    for (const punch of rawPunches) {
        try {
            const msEmpCode = String(punch.EmployeeCode || punch.employeecode || "");
            const msDeviceId = Number(punch.DeviceId || punch.deviceid || 0);
            const device = allDevices.find((d) => Number(d.msId) === msDeviceId);

            if (!device || !msEmpCode) continue;

            const rawTime = punch.LogDate || punch.logdate || punch.TransactionStamp;
            const punchTime = typeof rawTime === "string"
                ? dayjs.tz(rawTime.replace("Z", ""), TZ)
                : dayjs.tz(rawTime, TZ);

            if (!punchTime.isValid()) continue;

            const onlyDate = punchTime.format("YYYY-MM-DD");
            const localTimestamp = punchTime.format("YYYY-MM-DD HH:mm:ss");

            const [empData] = await db.select({
                employeeName: people.employeeName,
                deptName: departments.name,
                desigName: designations.name,
            }).from(people)
                .leftJoin(departments, eq(people.departmentId, departments.id))
                .leftJoin(designations, eq(people.designationId, designations.id))
                .where(eq(people.employeeCode, msEmpCode)).limit(1);

            if (!empData) continue;

            const mapping = allDoorMappings.find(m =>
                m.inDeviceIds?.includes(msDeviceId) || m.outDeviceIds?.includes(msDeviceId)
            );

            const isIncoming = device.deviceDirection === "IN";
            const direction = isIncoming ? "IN" : "OUT";
            const doorName = mapping?.doorName || device.name;
            const doorId = mapping?.doorId || device.id;

            // Shift Detection (Current Punch)
            let detShiftName = "-";
            let detShiftTime = "N/A";
            let detWorkingHours = 8;

            for (const s of allShifts) {
                const [h, m] = (s.startTime || "00:00").split(":");
                const shiftStart = punchTime.clone().set("hour", parseInt(h)).set("minute", parseInt(m)).set("second", 0);
                const buffer = s.thresholdMins ?? 30;

                if (punchTime.isBetween(shiftStart.subtract(buffer, "minute"), shiftStart.add(buffer, "minute"), null, "[]")) {
                    detShiftName = s.name;
                    detShiftTime = `${s.startTime} - ${s.endTime}`;
                    detWorkingHours = s.workingHours || 8;
                    break;
                }
            }

            await db.transaction(async (tx) => {
                await tx.insert(employeeActivityLogs).values({
                    deviceLogId: Number(punch.DeviceLogId || punch.devicelogid || Date.now()),
                    employeeCode: msEmpCode,
                    employeeName: empData.employeeName,
                    deviceId: msDeviceId,
                    deviceName: device.name,
                    doorId: Number(doorId),
                    doorName: doorName,
                    direction: direction,
                    logDate: sql`${localTimestamp}::timestamp`,
                    onlyDate: onlyDate,
                    departmentName: empData.deptName || "N/A",
                    designationName: empData.desigName || "N/A",
                    isProductive: !doorName.toLowerCase().includes("gate"),
                    shiftName: detShiftName,
                    shiftTime: detShiftTime,
                }).onConflictDoNothing();

                await tx.execute(sql`
                    UPDATE people 
                    SET last_seen_time = ${localTimestamp}::timestamp, 
                        current_zone = ${isIncoming ? ZONES.IN : ZONES.OUT},
                        updated_at = NOW()
                    WHERE employee_code = ${msEmpCode}
                `);

                await recalculateAndSyncSummary(tx, msEmpCode, onlyDate);
            });

        } catch (err: any) {
            console.error(`❌ Error processing punch for ${punch.EmployeeCode}:`, err.message);
        }
    }
}

async function recalculateAndSyncSummary(tx: any, empCode: string, date: string) {
    const logs = await tx.select().from(employeeActivityLogs)
        .where(and(
            eq(employeeActivityLogs.employeeCode, empCode),
            eq(employeeActivityLogs.onlyDate, date)
        ))
        .orderBy(asc(employeeActivityLogs.logDate));

    if (!logs.length) return;

    // --- LOGIC: Pehle Punch se Shift Name aur Data nikalna ---
    // Hum sirf pehle log (First-In) ki shift ko hi accurate maante hain
    const firstLog = logs[0];
    const baseShiftName = firstLog.shiftName !== "-" ? firstLog.shiftName : " ";

    const [shiftData] = await tx.select().from(shifts).where(eq(shifts.name, baseShiftName)).limit(1);
    const finalShiftHrs = shiftData ? Number(shiftData.workingHours) : 8.5;
    const totalShiftMins = finalShiftHrs * 60;

    let productiveMinutes = 0;
    let stack: Record<number, any> = {};
    const firstIn = logs[0].logDate;
    const lastOut = logs[logs.length - 1].logDate;

    for (const log of logs) {
        if (log.direction === "IN") {
            stack[log.doorId] = log;
        } else if (log.direction === "OUT") {
            const inLog = stack[log.doorId];
            if (inLog) {
                const diff = dayjs(log.logDate).diff(dayjs(inLog.logDate), "minute");
                if (!log.doorName.toLowerCase().includes("gate")) {
                    productiveMinutes += Math.max(0, diff);
                }
                delete stack[log.doorId];
            }
        }
    }

    const totalPresenceMinutes = dayjs(lastOut).diff(dayjs(firstIn), "minute");
    const thresholdMins = ATTENDANCE_CONFIG.OT_THRESHOLD_MINUTES || 120;

    // --- OT FLOOR LOGIC ---
    let finalOTHours = 0;
    if (productiveMinutes >= (totalShiftMins + thresholdMins)) {
        const extraMinutes = productiveMinutes - totalShiftMins;
        finalOTHours = Math.floor(extraMinutes / 60);
    }

    console.log(`--- Debug [${empCode}] [${date}] ---`);
    console.log(`Using First Shift: ${baseShiftName} (${finalShiftHrs} hrs)`);
    console.log(`Productive Mins: ${productiveMinutes.toFixed(0)}`);
    console.log(`OT: ${finalOTHours} hrs`);
    console.log(`----------------------------------`);

    await tx.insert(dailyAttendanceSummary).values({
        employeeCode: empCode,
        employeeName: logs[0].employeeName,
        workDate: date,
        firstIn: firstIn,
        lastOut: lastOut,
        totalPresenceMinutes: Math.floor(totalPresenceMinutes),
        totalPresenceHours: (totalPresenceMinutes / 60).toFixed(2),
        productiveMinutes: Math.floor(productiveMinutes),
        productiveHours: (productiveMinutes / 60).toFixed(2),
        overtimeMinutes: finalOTHours * 60,
        otHours: finalOTHours.toFixed(2),
        efficiencyPercent: totalPresenceMinutes > 0 ? ((productiveMinutes / totalPresenceMinutes) * 100).toFixed(2) : "0.00",
        totalPunches: logs.length,
        attendanceStatus: ATTENDANCE_STATUS.PRESENT,
        shiftname: baseShiftName,
        shifttime: firstLog.shiftTime,
        doorName: logs[logs.length - 1].doorName,
    }).onConflictDoUpdate({
        target: [dailyAttendanceSummary.workDate, dailyAttendanceSummary.employeeCode],
        set: {
            lastOut: lastOut,
            totalPresenceMinutes: Math.floor(totalPresenceMinutes),
            totalPresenceHours: (totalPresenceMinutes / 60).toFixed(2),
            productiveMinutes: Math.floor(productiveMinutes),
            productiveHours: (productiveMinutes / 60).toFixed(2),
            overtimeMinutes: finalOTHours * 60,
            otHours: finalOTHours.toFixed(2),
            efficiencyPercent: totalPresenceMinutes > 0 ? ((productiveMinutes / totalPresenceMinutes) * 100).toFixed(2) : "0.00",
            totalPunches: logs.length,
            doorName: logs[logs.length - 1].doorName,
            shiftname: baseShiftName, // Ensure shift name stays consistent
        },
    });
}