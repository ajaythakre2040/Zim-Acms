import { db, mssqlPool } from "../db";
import { doors, doorDevices, devices } from "@shared/schema";
import { eq, inArray, and } from "drizzle-orm";
/**
 * 1. Sirf Active Doors Get Karne Ke Liye
 */
export async function getActiveDoors() {
    return await db
        .select()
        .from(doors)
        .where(eq(doors.isActive, true));
}
/**
 * 2. Active Doors aur Unse Linked Active Devices Get Karne Ke Liye
 * Returns: Active Devices array jo Active Doors se associated hain
 */
export async function getActiveDoorsWithDevices() {
    // Step 1: Sirf Active Doors fetch karein
    const activeDoors = await getActiveDoors();
    const activeDoorIds = activeDoors.map((d) => d.id);
    if (activeDoorIds.length === 0) {
        return { activeDoors: [], activeDevices: [] };
    }
    // Step 2: Active Doors ke doorDevices mapping fetch karein
    const activeMappings = await db
        .select()
        .from(doorDevices)
        .where(
            and(
                inArray(doorDevices.doorId, activeDoorIds),
                eq(doorDevices.isActive, true)
            )
        );
    // Step 3: Saare inDeviceIds aur outDeviceIds ko extract & flatten karein
    const activeDeviceMsIds = new Set<number>();
    activeMappings.forEach((mapping) => {
        (mapping.inDeviceIds || []).forEach((id) => activeDeviceMsIds.add(id));
        (mapping.outDeviceIds || []).forEach((id) => activeDeviceMsIds.add(id));
    });
    if (activeDeviceMsIds.size === 0) {
        return { activeDoors, activeDevices: [] };
    }
    // Step 4: Devices table se matching active devices fetch karein
    const activeDevices = await db
        .select()
        .from(devices)
        .where(
            and(
                inArray(devices.msId, Array.from(activeDeviceMsIds)),
                eq(devices.isActive, true)
            )
        );
    return {
        activeDoors,
        activeDevices,
    };
}
/**
 * 3. Specific Door Code (jaise MAIN_GATE_SYNC.CODE) ke basis par Active Devices fetch karne ke liye
 */
export async function getActiveDevicesByDoorCode(doorCode: string) {
    // Step 1: Specific Door Code and isActive check
    const activeDoorsList = await db
        .select()
        .from(doors)
        .where(and(eq(doors.code, doorCode), eq(doors.isActive, true)));
    const activeDoorIds = activeDoorsList.map((d) => d.id);
    if (activeDoorIds.length === 0) return [];
    // Step 2: doorDevices Mapping
    const Mappings = await db
        .select()
        .from(doorDevices)
        .where(
            and(
                inArray(doorDevices.doorId, activeDoorIds),
                eq(doorDevices.isActive, true)
            )
        );
    const deviceMsIds = new Set<number>();
    Mappings.forEach((mapping) => {
        (mapping.inDeviceIds || []).forEach((id) => deviceMsIds.add(id));
        (mapping.outDeviceIds || []).forEach((id) => deviceMsIds.add(id));
    });
    if (deviceMsIds.size === 0) return [];
    // Step 3: Fetch Active Devices
    return await db
        .select()
        .from(devices)
        .where(
            and(
                inArray(devices.msId, Array.from(deviceMsIds)),
                eq(devices.isActive, true)
            )
        );
}
/**
 * Helper function: Fetches a Set of Employee Codes who punched 'IN' TODAY 
 * at any Main Gate device (or specified devices) from MSSQL DeviceLogs.
 */
// export async function getValidTodayMainInEmployeeCodes(
//   targetDeviceIds: number[]
// ): Promise<Set<string>> {
//   const validInEmpCodesToday = new Set<string>();
//   if (!targetDeviceIds || targetDeviceIds.length === 0) {
//     return validInEmpCodesToday;
//   }
//   // Current Date ka Start Time (Today 00:00:00 AM)
//   const todayStart = new Date();
//   todayStart.setHours(0, 0, 0, 0);
//   try {
//     if (!mssqlPool.connected) {
//       await mssqlPool.connect();
//     }
//     const request = mssqlPool.request();
//     request.input("todayStart", todayStart);
//     const deviceIdsCsv = targetDeviceIds.join(",");
//     const query = `
//       SELECT DISTINCT EmployeeCode 
//       FROM DeviceLogs 
//       WHERE DeviceId IN (${deviceIdsCsv})
//         AND UPPER(Direction) = 'IN' 
//         AND LogDate >= @todayStart
//     `;
//     const result = await request.query(query);
//     if (result && result.recordset) {
//       for (const row of result.recordset) {
//         if (row?.EmployeeCode) {
//           validInEmpCodesToday.add(String(row.EmployeeCode).trim());
//         }
//       }
//     }
//   } catch (err) {
//     console.error(`[ERROR] Failed to fetch Today's IN logs from MSSQL:`, err);
//   }
//   return validInEmpCodesToday;
// }
export async function getValidTodayMainInEmployeeCodes(
    targetDeviceIds: number[]
): Promise<Set<string>> {
    const validInEmpCodesToday = new Set<string>();
    // ============================================================
    // 1. VALIDATE DEVICE IDS
    // ============================================================
    if (!targetDeviceIds || targetDeviceIds.length === 0) {
        return validInEmpCodesToday;
    }
    // ============================================================
    // 2. CLEAN / VALIDATE DEVICE IDS
    // ============================================================
    const safeDeviceIds = Array.from(
        new Set(
            targetDeviceIds
                .map((id) => Number(id))
                .filter(
                    (id) =>
                        Number.isFinite(id) &&
                        id > 0
                )
        )
    );
    if (safeDeviceIds.length === 0) {
        return validInEmpCodesToday;
    }
    // ============================================================
    // 3. LOCAL TODAY START
    //
    // Example:
    // 2026-08-01 00:00:00
    // ============================================================
    const now = new Date();
    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        now.getDate()
    ).padStart(2, "0");
    const todayStartStr =
        `${year}-${month}-${day} 00:00:00`;
    try {
        // ==========================================================
        // 4. CONNECT MSSQL
        // ==========================================================
        if (!mssqlPool.connected) {
            await mssqlPool.connect();
        }
        const request =
            mssqlPool.request();
        request.input(
            "todayStartStr",
            todayStartStr
        );
        const deviceIdsCsv =
            safeDeviceIds.join(",");
        const query = `
      ;WITH TodayMainGateLogs AS
      (
          SELECT
              EmployeeCode,
              DeviceId,
              LogDate,
              Direction,
              ROW_NUMBER() OVER
              (
                  PARTITION BY EmployeeCode
                  ORDER BY
                      LogDate DESC
              ) AS RowNum
          FROM DeviceLogs
          WHERE
              DeviceId IN (${deviceIdsCsv})
              AND LogDate >= @todayStartStr
              AND EmployeeCode IS NOT NULL
              AND LTRIM(RTRIM(EmployeeCode)) <> ''
              AND UPPER(
                    LTRIM(
                      RTRIM(Direction)
                    )
                  ) IN ('IN', 'OUT')
      )
      SELECT
          EmployeeCode,
          DeviceId,
          CONVERT(
              VARCHAR(19),
              LogDate,
              120
          ) AS FormattedLogDate,
          Direction
      FROM TodayMainGateLogs
      WHERE
          RowNum = 1
      ORDER BY
          EmployeeCode;
    `;
        const result =
            await request.query(query);
        // ==========================================================
        // 6. PROCESS LATEST STATUS
        // ==========================================================
        if (
            result &&
            Array.isArray(result.recordset)
        ) {
            for (const row of result.recordset) {
                if (!row?.EmployeeCode) {
                    continue;
                }
                const empCode =
                    String(
                        row.EmployeeCode
                    ).trim();
                const direction =
                    String(
                        row.Direction || ""
                    )
                        .trim()
                        .toUpperCase();
                if (!empCode) {
                    continue;
                }
                // ======================================================
                // ONLY LATEST IN IS VALID
                // ======================================================
                if (direction === "IN") {
                    validInEmpCodesToday.add(
                        empCode
                    );
                }
            }
        }
    } catch (err) {
        console.error(
            "[ERROR] Failed to fetch latest Main Gate status from MSSQL:",
            err
        );
    }
    // ============================================================
    // 7. RETURN ONLY EMPLOYEES WHOSE LATEST STATUS = IN
    // ============================================================
    return validInEmpCodesToday;
}
// export async function getValidTodayMainInEmployeeCodes(
//   targetDeviceIds: number[]
// ): Promise<Set<string>> {
//   const validInEmpCodesToday = new Set<string>();
//   if (!targetDeviceIds || targetDeviceIds.length === 0) {
//     return validInEmpCodesToday;
//   }
//   // Local Date String (YYYY-MM-DD 00:00:00)
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = String(now.getMonth() + 1).padStart(2, "0");
//   const day = String(now.getDate()).padStart(2, "0");
//   // Format: '2026-07-31 00:00:00'
//   const todayStartStr = `${year}-${month}-${day} 00:00:00`;
//   try {
//     if (!mssqlPool.connected) {
//       await mssqlPool.connect();
//     }
//     const request = mssqlPool.request();
//     request.input("todayStartStr", todayStartStr);
//     const deviceIdsCsv = targetDeviceIds.join(",");
//     // CONVERT() lagane se raw exact string milegi, bina kisi 5:30 hr offset issue ke!
//     const query = `
//       SELECT DISTINCT
//         EmployeeCode,
//         CONVERT(VARCHAR(19), LogDate, 120) AS FormattedLogDate,
//         Direction
//       FROM DeviceLogs
//       WHERE DeviceId IN (${deviceIdsCsv})
//         AND UPPER(Direction) = 'IN'
//         AND LogDate >= @todayStartStr
//       ORDER BY FormattedLogDate DESC
//     `;
//     const result = await request.query(query);
//     if (result && result.recordset) {
//       for (const row of result.recordset) {
//         if (row?.EmployeeCode) {
//           const empCode = String(row.EmployeeCode).trim();
//           validInEmpCodesToday.add(empCode);
//         }
//       }
//     }
//   } catch (err) {
//     console.error(`[ERROR] Failed to fetch Today's IN logs from MSSQL:`, err);
//   }
//   return validInEmpCodesToday;
// }