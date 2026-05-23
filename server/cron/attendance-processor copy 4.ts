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
    db.select().from(devices),
  ]);

  for (const punch of rawPunches) {
    try {
      const msEmpCode = String(punch.EmployeeCode || punch.employeecode || "");
      const msDeviceId = Number(punch.DeviceId || punch.deviceid || 0);
      const device = allDevices.find((d) => Number(d.msId) === msDeviceId);

      if (!device || !msEmpCode) continue;

      const rawTime = punch.LogDate || punch.logdate || punch.TransactionStamp;
      const punchTime =
        typeof rawTime === "string"
          ? dayjs.tz(rawTime.replace("Z", ""), TZ)
          : dayjs.tz(rawTime, TZ);

      if (!punchTime.isValid()) continue;

      const localTimestamp = punchTime.format("YYYY-MM-DD HH:mm:ss");
      const [empData] = await db
        .select({
          employeeName: people.employeeName,
          departmentId: people.departmentId,
          designationId: people.designationId,
          deptName: departments.name,
          desigName: designations.name,
          gender: people.gender,
        })
        .from(people)
        .leftJoin(departments, eq(people.departmentId, departments.id))
        .leftJoin(designations, eq(people.designationId, designations.id))
        .where(eq(people.employeeCode, msEmpCode))
        .limit(1);
      const isIncoming = device.deviceDirection === "IN";

      // 1. GET CURRENT STATE (Read from people table)
      const [empState] = await db
        .select()
        .from(people)
        .where(eq(people.employeeCode, msEmpCode))
        .limit(1);
      if (!empState) continue;

      // 2. SITUATION-BASED DATE LOCKING LOGIC
      let targetWorkDate = punchTime.format("YYYY-MM-DD");
      let currentNightFlag = empState.isNightShiftActive || false;

      if (isIncoming) {
        const hour = punchTime.hour();
        // Situation: Agar raat 10 PM se subah 4 AM ke beech IN ho raha hai
        if (hour >= 22 || hour <= 4) {
          currentNightFlag = true;
          // Agar 12 AM ke baad hai, toh pichle din ki date lock karo
          if (hour <= 4) {
            targetWorkDate = punchTime.subtract(1, "day").format("YYYY-MM-DD");
          }
        } else {
          currentNightFlag = false;
        }
      } else {
        // Situation: Jab OUT ho raha ho, hamesha pichla locked date hi use karein
        if (empState.activeShiftDate) {
          targetWorkDate = empState.activeShiftDate;
        }
      }

      // 3. SHIFT DETECTION (For display purposes)
      let detShiftName = "-";
      let detShiftTime = "N/A";
      for (const s of allShifts) {
        const [h, m] = (s.startTime || "00:00").split(":");
        const shiftStart = punchTime
          .clone()
          .set("hour", parseInt(h))
          .set("minute", parseInt(m))
          .set("second", 0);
        const buffer = s.thresholdMins ?? 120;

        if (
          punchTime.isBetween(
            shiftStart.subtract(buffer, "minute"),
            shiftStart.add(buffer, "minute"),
            null,
            "[]",
          )
        ) {
          detShiftName = s.name;
          detShiftTime = `${s.startTime} - ${s.endTime}`;
          break;
        }
      }

      const mapping = allDoorMappings.find(
        (m) =>
          m.inDeviceIds?.includes(msDeviceId) ||
          m.outDeviceIds?.includes(msDeviceId),
      );
      const doorName = mapping?.doorName || device.name || "Main Gate";
      const doorId = mapping?.doorId || device.id;

      await db.transaction(async (tx) => {
        // 4. ACTIVITY LOG INSERT (Uses targetWorkDate to ensure single row merge)
        await tx
          .insert(employeeActivityLogs)
          .values({
            deviceLogId: Number(
              punch.DeviceLogId || punch.devicelogid || Date.now(),
            ),
            employeeCode: msEmpCode,
            employeeName: empState.employeeName,
            deviceId: msDeviceId,
            deviceName: device.name,
            doorId: Number(doorId),
            doorName: doorName,
            direction: isIncoming ? "IN" : "OUT",
            logDate: sql`${localTimestamp}::timestamp`,
            onlyDate: targetWorkDate, // Locked Date
            departmentId: empData.departmentId,
            designationId: empData.designationId,
            departmentName: empData.deptName || "N/A",
            designationName: empData.desigName || "N/A",
            isProductive: !doorName.toLowerCase().includes("gate"),
            shiftName: detShiftName,
            shiftTime: detShiftTime,
          })
          .onConflictDoNothing();

        // 5. SITUATION-BASED PEOPLE TABLE UPDATE
        // Hum current_zone update nahi kar rahe kyunki wo dusra cron kar raha hai
        await tx.execute(sql`
                    UPDATE people SET 
                    last_seen_time = ${localTimestamp}::timestamp, 
                    active_shift_date = ${isIncoming ? targetWorkDate : empState.activeShiftDate},
                    is_night_shift_active = ${isIncoming ? currentNightFlag : false},
                    last_punch_door_id = ${Number(doorId)},
                    updated_at = NOW()
                    WHERE employee_code = ${msEmpCode}
                `);

        // 6. SYNC TO SUMMARY
        await recalculateAndSyncSummary(
          tx,
          msEmpCode,
          targetWorkDate,
          empData.gender,
        );
      });
    } catch (err: any) {
      console.error(
        `❌ Processing Error for ${punch.EmployeeCode}:`,
        err.message,
      );
    }
  }
}

async function recalculateAndSyncSummary(
  tx: any,
  empCode: string,
  date: string,
  gender: string | null,
) {
  const logs = await tx
    .select()
    .from(employeeActivityLogs)
    .where(
      and(
        eq(employeeActivityLogs.employeeCode, empCode),
        eq(employeeActivityLogs.onlyDate, date),
      ),
    )
    .orderBy(asc(employeeActivityLogs.logDate));

  if (!logs.length) return;

  const validShiftLog = logs.find(
    (l: any) => l.shiftName && l.shiftName !== "-",
  );
  const baseShiftName = validShiftLog?.shiftName || "-";
  const baseShiftTime = validShiftLog?.shiftTime || "N/A";

  const [shiftData] = await tx
    .select()
    .from(shifts)
    .where(eq(shifts.name, baseShiftName))
    .limit(1);
  const totalShiftMins = (shiftData?.workingHours || 8.5) * 60;

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
        if (log.doorName && !log.doorName.toLowerCase().includes("gate")) {
          productiveMinutes += Math.max(0, diff);
        }
        delete stack[log.doorId];
      }
    }
  }

  const totalPresenceMinutes = dayjs(lastOut).diff(dayjs(firstIn), "minute");
  const extraMins = productiveMinutes - totalShiftMins;
  const finalOTHours =
    extraMins >= (ATTENDANCE_CONFIG.OT_THRESHOLD_MINUTES || 120)
      ? Math.floor(extraMins / 60)
      : 0;

  await tx
    .insert(dailyAttendanceSummary)
    .values({
      employeeCode: empCode,
      employeeName: logs[0].employeeName,
      workDate: date,
      firstIn,
      lastOut,
      totalPresenceMinutes: Math.floor(totalPresenceMinutes),
      totalPresenceHours: (totalPresenceMinutes / 60).toFixed(2),
      productiveMinutes: Math.floor(productiveMinutes),
      productiveHours: (productiveMinutes / 60).toFixed(2),
      overtimeMinutes: finalOTHours * 60,
      otHours: finalOTHours.toFixed(2),
      efficiencyPercent:
        totalPresenceMinutes > 0
          ? ((productiveMinutes / totalPresenceMinutes) * 100).toFixed(2)
          : "0.00",
      totalPunches: logs.length,
      attendanceStatus: ATTENDANCE_STATUS.PRESENT,
      shiftname: baseShiftName,
      shifttime: baseShiftTime,
      departmentId: logs[0].departmentId,
      designationId: logs[0].designationId,
      departmentName: logs[0].departmentName,
      designationName: logs[0].designationName,
      gender: gender || "-",
    })
    .onConflictDoUpdate({
      target: [
        dailyAttendanceSummary.workDate,
        dailyAttendanceSummary.employeeCode,
      ],
      set: {
        lastOut,
        totalPresenceMinutes: Math.floor(totalPresenceMinutes),
        totalPresenceHours: (totalPresenceMinutes / 60).toFixed(2),
        productiveMinutes: Math.floor(productiveMinutes),
        productiveHours: (productiveMinutes / 60).toFixed(2),
        overtimeMinutes: finalOTHours * 60,
        otHours: finalOTHours.toFixed(2),
        efficiencyPercent:
          totalPresenceMinutes > 0
            ? ((productiveMinutes / totalPresenceMinutes) * 100).toFixed(2)
            : "0.00",
        totalPunches: logs.length,
        gender: gender || "-",
        departmentId: logs[0].departmentId,
        designationId: logs[0].designationId,
        departmentName: logs[0].departmentName,
        designationName: logs[0].designationName,
      },
    });
}
