import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatDateTime(dt: string | Date | null | undefined) {
  if (!dt) return "-";

  // Safe handling: string hai toh process karo, nahi toh direct use karo
  const dateStr = typeof dt === "string" ? dt.replace("Z", "") : dt;
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTime(dt: string | Date | null | undefined) {
  if (!dt || dt === "N/A") return "-";

  const dateStr = typeof dt === "string" ? dt.replace("Z", "") : dt;
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
export const capitalizeFirst = (str: string | undefined | null) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export function exportCSV(fileName: string, data: any[]) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((field) => {
        let value = row[field];
        if (value === null || value === undefined) value = "";
        else if (typeof value === "object") value = JSON.stringify(value);
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      })
      .join(","),
  );
  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
}

export async function exportAttendanceCSV(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    // 🔥 Filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    console.log("ATTENDANCE EXPORT PARAMS =>", params.toString());

    const res = await fetch(`/api/reports/attendance?${params.toString()}`);

    if (!res.ok) {
      throw new Error("Attendance export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("ATTENDANCE EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData)) return;

    const rows = reportData.map((r: any) => ({
      Employee: r.firstName || r.employeeName || "-",

      "Employee Code": r.employeeCode || "-",

      Date: r.date || "-",

      "Clock In": r.clockIn ? formatTime(r.clockIn) : "-",

      Status: r.status || "-",
    }));

    if (!rows.length) return;

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `Attendance_Report.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (err) {
    console.error("Attendance Export Error:", err);
  }
}

export async function exportAttendancePDF(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    const res = await fetch(`/api/reports/attendance?${params.toString()}`);

    if (!res.ok) {
      throw new Error("Attendance export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData)) return;

    const rows = reportData.map((r: any) => [
      r.firstName || r.employeeName || "-",
      r.employeeCode || "-",
      r.date || "-",
      r.clockIn ? formatTime(r.clockIn) : "-",
      r.status || "-",
    ]);

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Attendance Report", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [["Employee", "Employee Code", "Date", "Clock In", "Status"]],
      body: rows,
    });

    doc.save("Attendance_Report.pdf");
  } catch (err) {
    console.error("Attendance PDF Export Error:", err);
  }
}

export async function exportAccessLogsCSV(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    // 🔥 filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    console.log("EXPORT PARAMS =>", params.toString());

    const res = await fetch(`/api/reports_access_logs?${params.toString()}`);

    if (!res.ok) {
      throw new Error("Export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData)) return;

    const rows = reportData.map((r: any) => ({
      "Device Log ID": r.DeviceLogId || r.devicelogid || "-",

      "Employee Name": r.employee_name || r.employeeName || "-",

      "Employee Code": r.employeecode || r.employeeCode || "-",

      Department: r.department_name || "-",

      Designation: r.designation_name || "-",

      "Device ID": r.deviceid || r.DeviceId || "-",

      "Door Name": r.door_name || r.DoorName || "-",

      Direction: r.direction || "-",

      "Log Date":
        r.logdate || r.LogDate
          ? formatDateTime(r.logdate || r.LogDate).toLocaleString()
          : "-",
    }));

    if (!rows.length) return;

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `Access_Logs_Report.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (err) {
    console.error("Export Error:", err);
  }
}

export async function exportAccessLogsPDF(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    const res = await fetch(`/api/reports_access_logs?${params.toString()}`);

    if (!res.ok) {
      throw new Error("Export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData) || !reportData.length) return;

    const rows = reportData.map((r: any) => [
      r.DeviceLogId || r.devicelogid || "-",
      r.employee_name || r.employeeName || "-",
      r.employeecode || r.employeeCode || "-",
      r.department_name || "-",
      r.designation_name || "-",
      r.deviceid || r.DeviceId || "-",
      r.door_name || r.DoorName || "-",
      r.direction || "-",
      r.logdate || r.LogDate
        ? formatDateTime(r.logdate || r.LogDate).toLocaleString()
        : "-",
    ]);

    const doc = new jsPDF("landscape");

    doc.setFontSize(16);
    doc.text("Access Logs Report", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [
        [
          "Device Log ID",
          "Employee Name",
          "Employee Code",
          "Department",
          "Designation",
          "Device ID",
          "Door Name",
          "Direction",
          "Log Date",
        ],
      ],
      body: rows,
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fontStyle: "bold",
      },
    });

    doc.save("Access_Logs_Report.pdf");
  } catch (err) {
    console.error("PDF Export Error:", err);
  }
}

export async function exportEmpProductiveEfficiencyCSV(
  currentAppliedFilters: any,
  doors: any[],
) {
  try {
    const params = new URLSearchParams();

    // 🔥 Filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    console.log("EFFICIENCY EXPORT PARAMS =>", params.toString());

    const res = await fetch(
      `/api/reports/employee-productive-report?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Efficiency export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("EFFICIENCY EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData)) return;

    // 🔥 Time formatter
    const formatTimeCSV = (time: any) => {
      if (!time || time === "-") return "-";

      const d = new Date(time);

      if (isNaN(d.getTime())) return String(time);

      // 🔥 UTC time ko same rakhne ke liye
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    };

    const rows: any[] = [];

    reportData.forEach((r: any) => {
      // 🔥 Door grouping
      const groupedDoors: Record<
        string,
        {
          in: string[];
          out: string[];
        }
      > = {};

      (r.movementDetails || []).forEach((m: any) => {
        const key = String(m.doorName || "")
          .trim()
          .toLowerCase();

        if (!groupedDoors[key]) {
          groupedDoors[key] = {
            in: [],
            out: [],
          };
        }

        if (m.inTime) {
          groupedDoors[key].in.push(formatTimeCSV(m.inTime));
        }

        if (m.outTime) {
          groupedDoors[key].out.push(formatTimeCSV(m.outTime));
        }
      });

      // 🔥 Dynamic door columns
      const doorValues = doors.flatMap((d) => {
        const key = String(d.DeviceName || d.name || "")
          .trim()
          .toLowerCase();

        const doorData = groupedDoors[key];

        return [
          doorData?.in?.length ? doorData.in.join("\n") : "-",

          doorData?.out?.length ? doorData.out.join("\n") : "-",
        ];
      });

      // 🔥 Efficiency calc
      const efficiency =
        Number(r.totalPresenceMinutes || 0) > 0
          ? `${(
              (Number(r.productiveMinutes || 0) /
                Number(r.totalPresenceMinutes || 0)) *
              100
            ).toFixed(2)}%`
          : "-";

      rows.push([
        r.employeeCode || "-",

        r.employeeName || "-",

        r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-",

        ...doorValues,

        r.totalPresenceHours
          ? `${Number(r.totalPresenceHours).toFixed(2)}h`
          : "-",

        r.productiveHours ? `${Number(r.productiveHours).toFixed(2)}h` : "-",

        efficiency,
      ]);
    });

    // 🔥 Headers
    const headers = [
      "Employee Code",

      "Employee Name",

      "Log Date",

      ...doors.flatMap((d) => [
        `${d.DeviceName || d.name} IN`,
        `${d.DeviceName || d.name} OUT`,
      ]),

      "Total Time",

      "Productive Time",

      "Efficiency %",
    ];

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "Employee_Productive_Efficiency_Report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (err) {
    console.error("Efficiency Export Error:", err);
  }
}

export async function exportEmpProductiveEfficiencyPDF(
  currentAppliedFilters: any,
  doors: any[],
) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    const res = await fetch(
      `/api/reports/employee-productive-report?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Efficiency export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData) || !reportData.length) return;

    const formatTimePDF = (time: any) => {
      if (!time || time === "-") return "-";

      const d = new Date(time);

      if (isNaN(d.getTime())) return String(time);

      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    };

    const rows: any[] = [];

    reportData.forEach((r: any) => {
      const groupedDoors: Record<
        string,
        {
          in: string[];
          out: string[];
        }
      > = {};

      (r.movementDetails || []).forEach((m: any) => {
        const key = String(m.doorName || "")
          .trim()
          .toLowerCase();

        if (!groupedDoors[key]) {
          groupedDoors[key] = {
            in: [],
            out: [],
          };
        }

        if (m.inTime) {
          groupedDoors[key].in.push(formatTimePDF(m.inTime));
        }

        if (m.outTime) {
          groupedDoors[key].out.push(formatTimePDF(m.outTime));
        }
      });

      const doorValues = doors.flatMap((d) => {
        const key = String(d.DeviceName || d.name || "")
          .trim()
          .toLowerCase();

        const doorData = groupedDoors[key];

        return [
          doorData?.in?.length ? doorData.in.join("\n") : "-",

          doorData?.out?.length ? doorData.out.join("\n") : "-",
        ];
      });

      const efficiency =
        Number(r.totalPresenceMinutes || 0) > 0
          ? `${(
              (Number(r.productiveMinutes || 0) /
                Number(r.totalPresenceMinutes || 0)) *
              100
            ).toFixed(2)}%`
          : "-";

      rows.push([
        r.employeeCode || "-",

        r.employeeName || "-",

        r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-",

        ...doorValues,

        r.totalPresenceHours
          ? `${Number(r.totalPresenceHours).toFixed(2)}h`
          : "-",

        r.productiveHours ? `${Number(r.productiveHours).toFixed(2)}h` : "-",

        efficiency,
      ]);
    });

    const headers = [
      "Employee Code",

      "Employee Name",

      "Log Date",

      ...doors.flatMap((d) => [
        `${d.DeviceName || d.name} IN`,
        `${d.DeviceName || d.name} OUT`,
      ]),

      "Total Time",

      "Productive Time",

      "Efficiency %",
    ];

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    doc.setFontSize(16);
    doc.text("Employee Productive Efficiency Report", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [headers],
      body: rows,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fontStyle: "bold",
      },
      tableWidth: "auto",
    });

    doc.save("Employee_Productive_Efficiency_Report.pdf");
  } catch (err) {
    console.error("Employee Productive Efficiency PDF Export Error:", err);
  }
}

export async function exportEmpPMovementLogsCSV(
  currentAppliedFilters: any,
  doors: any[],
) {
  try {
    const params = new URLSearchParams();

    // 🔥 Filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    console.log("EFFICIENCY EXPORT PARAMS =>", params.toString());

    const res = await fetch(
      `/api/reports/employee-movement-logs?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Efficiency export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("EFFICIENCY EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData)) return;

    // 🔥 Time formatter
    const formatTimeCSV = (time: any) => {
      if (!time || time === "-") return "-";

      const d = new Date(time);

      if (isNaN(d.getTime())) return String(time);

      // 🔥 UTC time ko same rakhne ke liye
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    };

    const rows: any[] = [];

    reportData.forEach((r: any) => {
      // 🔥 Door grouping
      const groupedDoors: Record<
        string,
        {
          in: string[];
          out: string[];
        }
      > = {};

      (r.movementDetails || []).forEach((m: any) => {
        const key = String(m.doorName || "")
          .trim()
          .toLowerCase();

        if (!groupedDoors[key]) {
          groupedDoors[key] = {
            in: [],
            out: [],
          };
        }

        if (m.inTime) {
          groupedDoors[key].in.push(formatTimeCSV(m.inTime));
        }

        if (m.outTime) {
          groupedDoors[key].out.push(formatTimeCSV(m.outTime));
        }
      });

      // 🔥 Dynamic door columns
      const doorValues = doors.flatMap((d) => {
        const key = String(d.DeviceName || d.name || "")
          .trim()
          .toLowerCase();

        const doorData = groupedDoors[key];

        return [
          doorData?.in?.length ? doorData.in.join("\n") : "-",

          doorData?.out?.length ? doorData.out.join("\n") : "-",
        ];
      });

      rows.push([
        r.employeeCode || "-",

        r.employeeName || "-",

        r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-",

        ...doorValues,
      ]);
    });

    // 🔥 Headers
    const headers = [
      "Employee Code",

      "Employee Name",

      "Log Date",

      ...doors.flatMap((d) => [
        `${d.DeviceName || d.name} IN`,
        `${d.DeviceName || d.name} OUT`,
      ]),
    ];

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "Employee_Productive_Efficiency_Report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (err) {
    console.error("Efficiency Export Error:", err);
  }
}

export async function exportEmpPMovementLogsPDF(
  currentAppliedFilters: any,
  doors: any[],
) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    const res = await fetch(
      `/api/reports/employee-movement-logs?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Movement Logs export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData) || !reportData.length) return;

    const formatTimePDF = (time: any) => {
      if (!time || time === "-") return "-";

      const d = new Date(time);

      if (isNaN(d.getTime())) return String(time);

      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    };

    const rows: any[] = [];

    reportData.forEach((r: any) => {
      const groupedDoors: Record<
        string,
        {
          in: string[];
          out: string[];
        }
      > = {};

      (r.movementDetails || []).forEach((m: any) => {
        const key = String(m.doorName || "")
          .trim()
          .toLowerCase();

        if (!groupedDoors[key]) {
          groupedDoors[key] = {
            in: [],
            out: [],
          };
        }

        if (m.inTime) {
          groupedDoors[key].in.push(formatTimePDF(m.inTime));
        }

        if (m.outTime) {
          groupedDoors[key].out.push(formatTimePDF(m.outTime));
        }
      });

      const doorValues = (doors || []).flatMap((d) => {
        const key = String(d.DeviceName || d.name || "")
          .trim()
          .toLowerCase();

        const doorData = groupedDoors[key];

        return [
          doorData?.in?.length ? doorData.in.join(", ") : "-",

          doorData?.out?.length ? doorData.out.join(", ") : "-",
        ];
      });

      rows.push([
        r.employeeCode || "-",

        r.employeeName || "-",

        r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-",

        ...doorValues,
      ]);
    });

    const headers = [
      "Employee Code",

      "Employee Name",

      "Log Date",

      ...(doors || []).flatMap((d) => [
        `${d.DeviceName || d.name} IN`,
        `${d.DeviceName || d.name} OUT`,
      ]),
    ];

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    doc.setFontSize(16);

    doc.text("Employee Movement Logs Report", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [headers],
      body: rows,

      styles: {
        fontSize: 7,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185], // Blue
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Employee_Movement_Logs_Report.pdf");
  } catch (err) {
    console.error("Employee Movement Logs PDF Export Error:", err);
  }
}

export async function exportDailyPerformanceCSV(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    // 🔥 Filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    console.log("DAILY PERFORMANCE EXPORT PARAMS =>", params.toString());

    const res = await fetch(
      `/api/reports/daily-efficiency?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Daily performance export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("DAILY PERFORMANCE EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData)) return;

    const rows = reportData.map((r: any) => ({
      "Employee Name": r.employeeName || "-",
      "Employee Code": r.employeeCode || "-",
      Gender: r.gender || "-",

      "Log Date": r.workDate
        ? new Date(r.workDate).toLocaleDateString("en-GB")
        : "-",

      Shift: r.shiftname || "-",

      "Shift Time": r.shifttime || "-",

      "In Punch": r.firstIn ? formatTime(r.firstIn) : "-",

      "Out Punch": r.lastOut ? formatTime(r.lastOut) : "-",

      "Hours Worked": r.productiveHours
        ? `${Number(r.productiveHours).toFixed(2)}h`
        : "0h",

      "Duty Status": r.attendanceStatus || "-",

      "OT Hrs": r.otHours ? `${Number(r.otHours).toFixed(2)}h` : "0h",
    }));

    if (!rows.length) return;

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `Daily_Performance_Report.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (err) {
    console.error("Daily Performance Export Error:", err);
  }
}

export async function exportDailyPerformancePDF(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    const res = await fetch(
      `/api/reports/daily-efficiency?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Daily performance export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData) || !reportData.length) return;

    const rows = reportData.map((r: any) => [
      r.employeeName || "-",

      r.employeeCode || "-",

      r.gender || "-",

      r.workDate ? new Date(r.workDate).toLocaleDateString("en-GB") : "-",

      r.shiftname || "-",

      r.shifttime || "-",

      r.firstIn ? formatTime(r.firstIn) : "-",

      r.lastOut ? formatTime(r.lastOut) : "-",

      r.productiveHours ? `${Number(r.productiveHours).toFixed(2)}h` : "0h",

      r.attendanceStatus || "-",

      r.otHours ? `${Number(r.otHours).toFixed(2)}h` : "0h",
    ]);

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);

    doc.text("Daily Performance Report", 14, 15);

    autoTable(doc, {
      startY: 25,

      head: [
        [
          "Employee Name",
          "Employee Code",
          "Gender",
          "Log Date",
          "Shift",
          "Shift Time",
          "In Punch",
          "Out Punch",
          "Hours Worked",
          "Duty Status",
          "OT Hrs",
        ],
      ],

      body: rows,

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185], // same blue
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Daily_Performance_Report.pdf");
  } catch (err) {
    console.error("Daily Performance PDF Export Error:", err);
  }
}

export async function exportMonthlyStatusCSV(data: any[], daysInMonth: number) {
  if (!data.length) return;

  const grouped: Record<string, any> = {};

  const today = new Date().getDate();

  // 🔥 GROUPING (same as table)
  data.forEach((emp: any) => {
    if (!grouped[emp.employeeName]) {
      grouped[emp.employeeName] = {
        employeeName: emp.employeeName,
        perDayRate: emp.perDayRate || 0,
        days: {},
        present: 0,
        absent: 0,
        off: 0,
      };
    }

    emp.records.forEach((r: any) => {
      const date = new Date(r.workDate).getDate();
      const status = (r.attendanceStatus || "").toLowerCase();

      grouped[emp.employeeName].days[date] = status;

      if (status === "present") grouped[emp.employeeName].present++;
      else if (status === "absent") grouped[emp.employeeName].absent++;
      else grouped[emp.employeeName].off++;
    });
  });

  const employees = Object.values(grouped);

  // 🔥 HEADER
  const headers = [
    "Employee Name",
    ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),
    "Present",
    "Off",
    "Absent",
    "Total Days",
  ];

  const rows = employees.map((emp: any) => {
    const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const status = emp.days[day];

      if (status === "present") return "P";
      if (status === "absent") return "A";
      if (status === "off") return "O";

      // 🔥 SAME LOGIC AS TABLE
      if (day < today) return "A"; // past missing = absent
      return "-"; // future/current missing
    });

    // 🔥 dynamic absent same as UI
    const dynamicAbsent = Array.from(
      { length: daysInMonth },
      (_, i) => i + 1,
    ).filter((d) => d < today && !emp.days[d]).length;

    const finalAbsent = emp.absent + dynamicAbsent;
    const totalDays = emp.present + emp.off + finalAbsent;

    return [
      emp.employeeName,
      ...dayValues,
      emp.present,
      emp.off,
      finalAbsent,
      totalDays,
    ];
  });

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "monthly-status-summary.csv";
  a.click();

  URL.revokeObjectURL(url);
}

export function exportMonthlyStatusPDF(data: any[], daysInMonth: number) {
  try {
    if (!data.length) return;

    const grouped: Record<string, any> = {};

    const today = new Date().getDate();

    data.forEach((emp: any) => {
      if (!grouped[emp.employeeName]) {
        grouped[emp.employeeName] = {
          employeeName: emp.employeeName,
          perDayRate: emp.perDayRate || 0,
          days: {},
          present: 0,
          absent: 0,
          off: 0,
        };
      }

      emp.records.forEach((r: any) => {
        const date = new Date(r.workDate).getDate();
        const status = (r.attendanceStatus || "").toLowerCase();

        grouped[emp.employeeName].days[date] = status;

        if (status === "present") grouped[emp.employeeName].present++;
        else if (status === "absent") grouped[emp.employeeName].absent++;
        else grouped[emp.employeeName].off++;
      });
    });

    const employees = Object.values(grouped);

    const headers = [
      "Employee Name",

      ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),

      "Present",
      "Off",
      "Absent",
      "Total Days",
    ];

    const rows = employees.map((emp: any) => {
      const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const status = emp.days[day];

        if (status === "present") return "P";
        if (status === "absent") return "A";
        if (status === "off") return "O";

        if (day < today) return "A";

        return "-";
      });

      const dynamicAbsent = Array.from(
        { length: daysInMonth },
        (_, i) => i + 1,
      ).filter((d) => d < today && !emp.days[d]).length;

      const finalAbsent = emp.absent + dynamicAbsent;

      const totalDays = emp.present + emp.off + finalAbsent;

      return [
        emp.employeeName,

        ...dayValues,

        emp.present,
        emp.off,
        finalAbsent,
        totalDays,
      ];
    });

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    doc.setFontSize(16);

    doc.text("Monthly Status Summary Report", 14, 15);

    autoTable(doc, {
      startY: 25,

      head: [headers],

      body: rows,

      styles: {
        fontSize: 7,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Monthly_Status_Summary_Report.pdf");
  } catch (err) {
    console.error("Monthly Status PDF Export Error:", err);
  }
}

export async function exportOTSummaryCSV(data: any[], daysInMonth: number) {
  if (!Array.isArray(data) || !data.length) return;

  const grouped: Record<string, any> = {};

  // 🔥 SAME GROUPING AS TABLE
  data.forEach((emp: any) => {
    if (!grouped[emp.employeeName]) {
      grouped[emp.employeeName] = {
        employeeName: emp.employeeName,
        days: {},
        totalWorkingHrs: 0,
      };
    }

    emp.records?.forEach((r: any) => {
      const date = new Date(r.date || r.workDate).getDate();

      // 🔥 SAME FIELD AS TABLE
      const otHours = Number(r.otHours || 0);

      grouped[emp.employeeName].days[date] = otHours;
      grouped[emp.employeeName].totalWorkingHrs += otHours;
    });
  });

  const employees = Object.values(grouped);

  // 🔥 HEADER (same structure as table)
  const headers = [
    "Employee Name",
    ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),
    "Total Hrs",
  ];

  const rows = employees.map((emp: any) => {
    const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const hrs = emp.days[day];

      // same UI behavior
      return hrs !== undefined ? Number(hrs).toFixed(0) : "0";
    });

    return [
      emp.employeeName,
      ...dayValues,
      Number(emp.totalWorkingHrs || 0).toFixed(0),
    ];
  });

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ot-summary.csv";
  a.click();

  URL.revokeObjectURL(url);
}

export function exportOTSummaryPDF(data: any[], daysInMonth: number) {
  try {
    if (!Array.isArray(data) || !data.length) return;

    const grouped: Record<string, any> = {};

    data.forEach((emp: any) => {
      if (!grouped[emp.employeeName]) {
        grouped[emp.employeeName] = {
          employeeName: emp.employeeName,
          days: {},
          totalWorkingHrs: 0,
        };
      }

      emp.records?.forEach((r: any) => {
        const date = new Date(r.date || r.workDate).getDate();

        const otHours = Number(r.otHours || 0);

        grouped[emp.employeeName].days[date] = otHours;

        grouped[emp.employeeName].totalWorkingHrs += otHours;
      });
    });

    const employees = Object.values(grouped);

    const headers = [
      "Employee Name",

      ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),

      "Total Hrs",
    ];

    const rows = employees.map((emp: any) => {
      const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const hrs = emp.days[day];

        return hrs !== undefined ? Number(hrs).toFixed(0) : "0";
      });

      return [
        emp.employeeName,

        ...dayValues,

        Number(emp.totalWorkingHrs || 0).toFixed(0),
      ];
    });

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    doc.setFontSize(16);

    doc.text("OT Summary Report", 14, 15);

    autoTable(doc, {
      startY: 25,

      head: [headers],

      body: rows,

      styles: {
        fontSize: 7,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185], // same blue
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("OT_Summary_Report.pdf");
  } catch (err) {
    console.error("OT Summary PDF Export Error:", err);
  }
}

export async function exportLockoutCSV(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    // 🔥 Filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    console.log("LOCKOUT EXPORT PARAMS =>", params.toString());

    const res = await fetch(`/api/reports/cabin-lockout?${params.toString()}`);

    if (!res.ok) {
      throw new Error("Lockout export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("LOCKOUT EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData)) return;

    const rows = reportData.map((row: any) => ({
      Employee: row.employeeName || "-",

      "Employee Code": row.employeeCode || "-",

      "Cabin / Door": row.doorName || "-",

      Status: row.status === "active" ? "ACTIVE" : "Inactive",

      "Expiry Time": row.lockoutExpiry
        ? formatDateTime(row.lockoutExpiry).toLocaleString()
        : "-",
    }));

    if (!rows.length) return;

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "Lockout_Report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (err) {
    console.error("Lockout Export Error:", err);
  }
}

export async function exportLockoutPDF(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    const res = await fetch(`/api/reports/cabin-lockout?${params.toString()}`);

    if (!res.ok) {
      throw new Error("Lockout export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || apiResponse || [];

    if (!Array.isArray(reportData) || !reportData.length) {
      return;
    }

    const rows = reportData.map((row: any) => [
      row.employeeName || "-",

      row.employeeCode || "-",

      row.doorName || "-",

      row.status === "active" ? "ACTIVE" : "Inactive",

      row.lockoutExpiry
        ? formatDateTime(row.lockoutExpiry).toLocaleString()
        : "-",
    ]);

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);

    doc.text("Lockout Report", 14, 15);

    autoTable(doc, {
      startY: 25,

      head: [
        ["Employee", "Employee Code", "Cabin / Door", "Status", "Expiry Time"],
      ],

      body: rows,

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Lockout_Report.pdf");
  } catch (err) {
    console.error("Lockout PDF Export Error:", err);
  }
}

export async function exportEmployeePerformanceCSV(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    // filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    // 🔥 IMPORTANT FIX: force full export (bypass pagination)
    params.set("page", "1");
    params.set("pageSize", "100000"); // or backend max limit

    console.log("EMPLOYEE EXPORT PARAMS =>", params.toString());

    const res = await fetch(
      `/api/reports/employee-efficiency-dateRange?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Employee performance export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("EMPLOYEE EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || [];

    if (!Array.isArray(reportData) || reportData.length === 0) return;

    const rows = reportData.map((r: any) => {
      const totalHours = Number(r.totalHours || 0);
      const productiveHours = Number(r.productiveHours || 0);

      const efficiency =
        totalHours > 0
          ? ((productiveHours / totalHours) * 100).toFixed(2)
          : "0.00";

      return {
        "Employee Code": r.employeeCode || "-",
        "Employee Name": r.employeeName || "-",

        "Date Range": r.dateRange
          ? r.dateRange
              .split(" to ")
              .map((d: string) => new Date(d).toLocaleDateString("en-GB"))
              .join(" To ")
          : "-",

        "Total Days": Number(r.totalDays || 0),
        "Total Hours": totalHours.toFixed(2),
        "Productive Hours": productiveHours.toFixed(2),

        "Avg. Efficiency %": `${efficiency}%`,
      };
    });

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Employee_Performance_Report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Employee Performance Export Error:", err);
  }
}

export async function exportEmployeePerformancePDF(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    // Full export
    params.set("page", "1");
    params.set("pageSize", "100000");

    const res = await fetch(
      `/api/reports/employee-efficiency-dateRange?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Employee performance export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || [];

    if (!Array.isArray(reportData) || !reportData.length) {
      return;
    }

    const rows = reportData.map((r: any) => {
      const totalHours = Number(r.totalHours || 0);

      const productiveHours = Number(r.productiveHours || 0);

      const efficiency =
        totalHours > 0
          ? ((productiveHours / totalHours) * 100).toFixed(2)
          : "0.00";

      return [
        r.employeeCode || "-",

        r.employeeName || "-",

        r.dateRange
          ? r.dateRange
              .split(" to ")
              .map((d: string) => new Date(d).toLocaleDateString("en-GB"))
              .join(" To ")
          : "-",

        Number(r.totalDays || 0),

        totalHours.toFixed(2),

        productiveHours.toFixed(2),

        `${efficiency}%`,
      ];
    });

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);

    doc.text("Employee Performance Report", 14, 15);

    autoTable(doc, {
      startY: 25,

      head: [
        [
          "Employee Code",
          "Employee Name",
          "Date Range",
          "Total Days",
          "Total Hours",
          "Productive Hours",
          "Avg. Efficiency %",
        ],
      ],

      body: rows,

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Employee_Performance_Report.pdf");
  } catch (err) {
    console.error("Employee Performance PDF Export Error:", err);
  }
}

export async function exportDepartmentEfficiencyCSV(
  currentAppliedFilters: any,
) {
  try {
    const params = new URLSearchParams();

    // filters add
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    // 🔥 IMPORTANT FIX: force full data export
    params.set("page", "1");
    params.set("pageSize", "100000"); // backend max limit

    console.log("DEPARTMENT EXPORT PARAMS =>", params.toString());

    const res = await fetch(
      `/api/reports/department-efficiency?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Department efficiency export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("DEPARTMENT EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || [];

    if (!Array.isArray(reportData) || reportData.length === 0) return;

    const rows = reportData.map((r: any) => {
      const totalHours = Number(r.totalManHours || 0);
      const productiveHours = Number(r.productiveHours || 0);

      const efficiency =
        totalHours > 0
          ? ((productiveHours / totalHours) * 100).toFixed(2)
          : "0.00";

      return {
        Department: r.department || "-",

        "Date Range": r.dateRange
          ? r.dateRange
              .split(" to ")
              .map((d: string) => new Date(d).toLocaleDateString("en-GB"))
              .join(" To ")
          : "-",

        "Total Manpower": Number(r.totalManpower || 0),

        "Total Man Hours": totalHours.toFixed(2),

        "Productive Hours": productiveHours.toFixed(2),

        "Avg. Efficiency %": `${efficiency}%`,
      };
    });

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Department_Efficiency_Report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Department Efficiency Export Error:", err);
  }
}

export async function exportDepartmentEfficiencyPDF(
  currentAppliedFilters: any,
) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    // Full export
    params.set("page", "1");
    params.set("pageSize", "100000");

    const res = await fetch(
      `/api/reports/department-efficiency?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Department efficiency export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || [];

    if (!Array.isArray(reportData) || !reportData.length) {
      return;
    }

    const rows = reportData.map((r: any) => {
      const totalHours = Number(r.totalManHours || 0);

      const productiveHours = Number(r.productiveHours || 0);

      const efficiency =
        totalHours > 0
          ? ((productiveHours / totalHours) * 100).toFixed(2)
          : "0.00";

      return [
        r.department || "-",

        r.dateRange
          ? r.dateRange
              .split(" to ")
              .map((d: string) => new Date(d).toLocaleDateString("en-GB"))
              .join(" To ")
          : "-",

        Number(r.totalManpower || 0),

        totalHours.toFixed(2),

        productiveHours.toFixed(2),

        `${efficiency}%`,
      ];
    });

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);

    doc.text("Department Efficiency Report", 14, 15);

    autoTable(doc, {
      startY: 25,

      head: [
        [
          "Department",
          "Date Range",
          "Total Manpower",
          "Total Man Hours",
          "Productive Hours",
          "Avg. Efficiency %",
        ],
      ],

      body: rows,

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Department_Efficiency_Report.pdf");
  } catch (err) {
    console.error("Department Efficiency PDF Export Error:", err);
  }
}

export async function exportDepartmentWiseManpowerCSV(
  currentAppliedFilters: any,
  departmentsData: any[] = [],
) {
  try {
    const params = new URLSearchParams();

    // 🔥 Filters
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    console.log("MANPOWER EXPORT PARAMS =>", params.toString());

    const res = await fetch(
      `/api/reports/department-wise-manpower?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Department manpower export fetch failed");
    }

    const apiResponse = await res.json();

    console.log("MANPOWER EXPORT RESPONSE =>", apiResponse);

    const reportData = apiResponse?.data || [];

    const footerTotals = apiResponse?.footerTotals || {};

    if (!Array.isArray(reportData)) return;

    // =========================================
    // 🔥 AUTO DEPARTMENT LIST CREATE
    // =========================================

    let finalDepartments = departmentsData;

    // Agar departments prop empty aaye
    // to data se auto department nikal lo
    if (!finalDepartments.length) {
      const deptMap = new Map();

      reportData.forEach((r: any) => {
        Object.keys(r.departments || {}).forEach((deptName) => {
          deptMap.set(deptName, {
            departmentName: deptName,
          });
        });
      });

      finalDepartments = Array.from(deptMap.values());
    }

    console.log("FINAL DEPARTMENTS =>", finalDepartments);

    // =========================================
    // 🔥 CREATE MAIN ROWS
    // =========================================

    const rows = reportData.map((r: any) => {
      const row: any = {
        "Employee Code": r.employeeCode || "-",

        "Employee Name": r.employeeName || "-",

        "Per Day Rate": r.perDayRate || 0,

        "Contractor Name": r.contractorName || "-",
      };

      // 🔥 Dynamic Department Columns
      finalDepartments.forEach((dept: any) => {
        const deptName = dept.departmentName || dept.name || "Unknown";

        const deptData = r.departments?.[deptName] || {};

        row[`${deptName} Duty`] = deptData?.duty || 0;

        row[`${deptName} OT Hrs`] = deptData?.otHours || 0;
      });

      // 🔥 Totals
      row["Total Duty"] = r.totalWorking?.duty || 0;

      row["Total OT Hrs"] = r.totalWorking?.otHours || 0;

      row["Duty Amount"] = r.amount?.dutyAmount || 0;

      row["OT Amount"] = r.amount?.otAmount || 0;

      row["Total Wages"] = r.amount?.totalWages || 0;

      return row;
    });

    // =========================================
    // 🔥 FOOTER ROW 1
    // =========================================

    const footerWorking: any = {
      "Employee Code": "",

      "Employee Name": "Device/Department Wise Working (Duty & OT)",

      "Per Day Rate": "",

      "Contractor Name": "",
    };

    finalDepartments.forEach((dept: any) => {
      const deptName = dept.departmentName || dept.name || "Unknown";

      const deptFooter = footerTotals?.departments?.[deptName] || {};

      footerWorking[`${deptName} Duty`] = deptFooter?.duty || 0;

      footerWorking[`${deptName} OT Hrs`] = deptFooter?.otHours || 0;
    });

    footerWorking["Total Duty"] = footerTotals?.totalWorking?.duty || 0;

    footerWorking["Total OT Hrs"] = footerTotals?.totalWorking?.otHours || 0;

    footerWorking["Duty Amount"] = footerTotals?.amount?.dutyAmount || 0;

    footerWorking["OT Amount"] = footerTotals?.amount?.otAmount || 0;

    footerWorking["Total Wages"] = footerTotals?.amount?.totalWages || 0;

    rows.push(footerWorking);

    // =========================================
    // 🔥 FOOTER ROW 2
    // =========================================

    const footerAmount: any = {
      "Employee Code": "",

      "Employee Name": "Device/Department Wise Amount (Rs.)",

      "Per Day Rate": "",

      "Contractor Name": "",
    };

    finalDepartments.forEach((dept: any) => {
      const deptName = dept.departmentName || dept.name || "Unknown";

      const deptFooter = footerTotals?.departments?.[deptName] || {};

      footerAmount[`${deptName} Duty`] = deptFooter?.dutyAmount || 0;

      footerAmount[`${deptName} OT Hrs`] = deptFooter?.otAmount || 0;
    });

    footerAmount["Total Duty"] = footerTotals?.totalWorking?.duty || 0;

    footerAmount["Total OT Hrs"] = footerTotals?.totalWorking?.otHours || 0;

    footerAmount["Duty Amount"] = footerTotals?.amount?.dutyAmount || 0;

    footerAmount["OT Amount"] = footerTotals?.amount?.otAmount || 0;

    footerAmount["Total Wages"] = footerTotals?.amount?.totalWages || 0;

    rows.push(footerAmount);

    if (!rows.length) return;

    // =========================================
    // 🔥 CSV CREATE
    // =========================================

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    // =========================================
    // 🔥 DOWNLOAD
    // =========================================

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "Department_Wise_Manpower_Report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (err) {
    console.error("Department Wise Manpower Export Error:", err);
  }
}

export async function exportDepartmentWiseManpowerPDF(
  currentAppliedFilters: any,
  departmentsData: any[] = [],
) {
  try {
    const params = new URLSearchParams();

    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    const res = await fetch(
      `/api/reports/department-wise-manpower?${params.toString()}`,
    );

    if (!res.ok) {
      throw new Error("Department manpower export fetch failed");
    }

    const apiResponse = await res.json();

    const reportData = apiResponse?.data || [];
    const footerTotals = apiResponse?.footerTotals || {};

    if (!Array.isArray(reportData)) return;

    let finalDepartments = departmentsData;

    if (!finalDepartments.length) {
      const deptMap = new Map();

      reportData.forEach((r: any) => {
        Object.keys(r.departments || {}).forEach((deptName) => {
          deptMap.set(deptName, {
            departmentName: deptName,
          });
        });
      });

      finalDepartments = Array.from(deptMap.values());
    }

    const rows: any[] = [];

    reportData.forEach((r: any) => {
      const row = [
        r.employeeCode || "-",

        r.employeeName || "-",

        r.perDayRate || 0,

        r.contractorName || "-",
      ];

      finalDepartments.forEach((dept: any) => {
        const deptName = dept.departmentName || dept.name || "Unknown";

        const deptData = r.departments?.[deptName] || {};

        row.push(deptData?.duty || 0);
        row.push(deptData?.otHours || 0);
      });

      row.push(
        r.totalWorking?.duty || 0,
        r.totalWorking?.otHours || 0,
        r.amount?.dutyAmount || 0,
        r.amount?.otAmount || 0,
        r.amount?.totalWages || 0,
      );

      rows.push(row);
    });

    // Footer 1
    const footerWorking: any[] = [
      "",
      "Device/Department Wise Working (Duty & OT)",
      "",
      "",
    ];

    finalDepartments.forEach((dept: any) => {
      const deptName = dept.departmentName || dept.name || "Unknown";

      const deptFooter = footerTotals?.departments?.[deptName] || {};

      footerWorking.push(deptFooter?.duty || 0, deptFooter?.otHours || 0);
    });

    footerWorking.push(
      footerTotals?.totalWorking?.duty || 0,
      footerTotals?.totalWorking?.otHours || 0,
      footerTotals?.amount?.dutyAmount || 0,
      footerTotals?.amount?.otAmount || 0,
      footerTotals?.amount?.totalWages || 0,
    );

    rows.push(footerWorking);

    // Footer 2
    const footerAmount: any[] = [
      "",
      "Device/Department Wise Amount (Rs.)",
      "",
      "",
    ];

    finalDepartments.forEach((dept: any) => {
      const deptName = dept.departmentName || dept.name || "Unknown";

      const deptFooter = footerTotals?.departments?.[deptName] || {};

      footerAmount.push(deptFooter?.dutyAmount || 0, deptFooter?.otAmount || 0);
    });

    footerAmount.push(
      footerTotals?.totalWorking?.duty || 0,
      footerTotals?.totalWorking?.otHours || 0,
      footerTotals?.amount?.dutyAmount || 0,
      footerTotals?.amount?.otAmount || 0,
      footerTotals?.amount?.totalWages || 0,
    );

    rows.push(footerAmount);

    const headers = [
      "Employee Code",
      "Employee Name",
      "Per Day Rate",
      "Contractor Name",

      ...finalDepartments.flatMap((dept: any) => [
        `${dept.departmentName || dept.name} Duty`,
        `${dept.departmentName || dept.name} OT Hrs`,
      ]),

      "Total Duty",
      "Total OT Hrs",
      "Duty Amount",
      "OT Amount",
      "Total Wages",
    ];

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    doc.setFontSize(16);

    doc.text("Department Wise Manpower Report", 14, 15);

    autoTable(doc, {
      startY: 25,

      head: [headers],

      body: rows,

      styles: {
        fontSize: 6,
        cellPadding: 1.5,
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Department_Wise_Manpower_Report.pdf");
  } catch (err) {
    console.error("Department Wise Manpower PDF Export Error:", err);
  }
}

export function exportEmployeeCSV(data: any[]) {
  try {
    if (!Array.isArray(data) || !data.length) return;

    const ruleNames: Record<number, string> = {
      0: "No Rule Assigned",
      1: "Main Gate In",
      2: "Cabin In",
      3: "Cabin Out",
      4: "Lockout Active",
      5: "Main Gate Out",
    };

    const rows = data.map((p: any) => ({
      Name: p.employeeName || "-",

      "Emp Code": p.employeeCode || "-",

      "Cabin Lockout": p.is_lockout_enabled ? "ACTIVE" : "INACTIVE",

      "Current Rule": ruleNames[p.ruleid ?? 0] || "Unknown",

      "Last Door Access": p.lastPunchDoorId
        ? p.lastPunchDoorName || "-"
        : "Never",

      "Last Seen": p?.lastSeenTime ? formatDateTime(p.lastSeenTime) : "-",

      Status: p.status || "-",

      Email: p.email || "-",

      Phone: p.phone || "-",

      Type: p.personType || "-",

      Gender: p.gender || "-",

      Department: p.departmentName || "-",

      Designation: p.designationName || "-",

      "Date Of Joining": p.dateOfJoining
        ? new Date(p.dateOfJoining).toLocaleDateString("en-GB")
        : "-",
    }));

    const headers = Object.keys(rows[0]);

    const escapeCSV = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),

      ...rows.map((row: any) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "Employees.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Cabin Lockout Export Error:", err);
  }
}

export function exportEmployeePDF(data: any[]) {
  try {
    if (!Array.isArray(data) || !data.length) return;

    const ruleNames: Record<number, string> = {
      0: "No Rule Assigned",
      1: "Main Gate In",
      2: "Cabin In",
      3: "Cabin Out",
      4: "Lockout Active",
      5: "Main Gate Out",
    };

    const rows = data.map((p: any) => [
      p.employeeName || "-",

      p.employeeCode || "-",

      p.is_lockout_enabled ? "ACTIVE" : "INACTIVE",

      ruleNames[p.ruleid ?? 0] || "Unknown",

      p.lastPunchDoorId ? p.lastPunchDoorName || "-" : "Never",

      p?.lastSeenTime ? formatDateTime(p.lastSeenTime) : "-",

      p.status || "-",

      p.email || "-",

      p.phone || "-",

      p.personType || "-",

      p.gender || "-",

      p.departmentName || "-",

      p.designationName || "-",

      p.dateOfJoining
        ? new Date(p.dateOfJoining).toLocaleDateString("en-GB")
        : "-",
    ]);

    const headers = [
      [
        "Name",
        "Emp Code",
        "Cabin Lockout",
        "Current Rule",
        "Last Door Access",
        "Last Seen",
        "Status",
        "Email",
        "Phone",
        "Type",
        "Gender",
        "Department",
        "Designation",
        "Date Of Joining",
      ],
    ];

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    doc.setFontSize(16);
    doc.text("Employee Report", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: headers,
      body: rows,

      styles: {
        fontSize: 7,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [41, 128, 185], // same blue header
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      theme: "grid",
    });

    doc.save("Employees.pdf");
  } catch (err) {
    console.error("Employee PDF Export Error:", err);
  }
}

export const exportShiftDashboardCSV = (
  data: any[],
  shifts: any[],
  fileName: string,
  date?: string,
) => {
  if (!data?.length) return;

  // Headers
  const headers = ["Door Name", ...shifts.map((s) => s.name), "Total Emp"];

  // Rows
  const rows = data.map((row: any) => [
    row.doorName,
    ...shifts.map((s) => row[s.name] ?? 0),
    row.totalEmp,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows].map((r) => r.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.href = encodedUri;
  link.download = `${fileName}_${date || "report"}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportShiftDashboardPDF = (
  data: any[],
  shifts: any[],
  fileName: string,
  date?: string,
) => {
  if (!data?.length) return;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(14);
  doc.text(`${fileName} Report`, 14, 15);

  if (date) {
    doc.setFontSize(10);
    doc.text(`Date: ${date}`, 14, 22);
  }

  // Table headers
  const headers = [["Door Name", ...shifts.map((s) => s.name), "Total Emp"]];

  // Table rows
  const rows = data.map((row: any) => [
    row.doorName,
    ...shifts.map((s) => row[s.name] ?? 0),
    row.totalEmp,
  ]);

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 30,
    styles: {
      fontSize: 9,
    },
  });

  doc.save(`${fileName}_${date || "report"}.pdf`);
};

export const exportMachineLogsCSV = (data: any[]) => {
  if (!data?.length) return;

  const headers = [
    "Employee Name",
    "Employee Code",
    "Door Name",
    "Device Name",
    "Direction",
    "Log Date",
  ];

  const rows = data.map((log: any) => {
    const dateObj = new Date(log.logDate);
    const cleanDate = dateObj.toISOString().replace("T", " ").split(".")[0];

    return [
      log.employeeName,
      log.employeeCode,
      log.doorName,
      log.deviceName,
      log.direction,
      cleanDate,
    ];
  });

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell ?? ""}"`).join(","))
      .join("\n");

  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.href = encodedUri;
  link.download = "machine_logs.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportMachineLogsPDF = (data: any[]) => {
  if (!data?.length) return;

  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Machine Logs Report", 14, 15);

  const headers = [
    [
      "Employee Name",
      "Employee Code",
      "Door Name",
      "Device Name",
      "Direction",
      "Log Date",
    ],
  ];

  const rows = data.map((log: any) => {
    const dateObj = new Date(log.logDate);
    const cleanDate = dateObj.toISOString().replace("T", " ").split(".")[0];

    return [
      log.employeeName,
      log.employeeCode,
      log.doorName,
      log.deviceName,
      log.direction,
      cleanDate,
    ];
  });

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 25,
    styles: {
      fontSize: 9,
    },
  });

  doc.save("machine_logs.pdf");
};

export const exportDoorAttendanceCSV = (
  doorStats: any[],
  selectedDate?: string,
) => {
  if (!doorStats?.length) return;

  // Headers
  const headers = ["Direction", ...doorStats.map((d: any) => d.doorName)];

  // Rows
  const rows = [
    ["IN", ...doorStats.map((d: any) => d.inCount)],
    ["OUT", ...doorStats.map((d: any) => d.outCount)],
    ["BAL", ...doorStats.map((d: any) => d.balance)],
  ];

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell ?? 0}"`).join(","))
      .join("\n");

  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.href = encodedUri;
  link.download = `door_attendance_${selectedDate || "report"}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportDoorAttendancePDF = (
  doorStats: any[],
  selectedDate?: string,
) => {
  if (!doorStats?.length) return;

  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Door Attendance Report", 14, 15);

  if (selectedDate) {
    doc.setFontSize(10);
    doc.text(`Date: ${selectedDate}`, 14, 22);
  }

  const headers = [["Direction", ...doorStats.map((d: any) => d.doorName)]];

  const rows = [
    ["IN", ...doorStats.map((d: any) => d.inCount)],
    ["OUT", ...doorStats.map((d: any) => d.outCount)],
    ["BAL", ...doorStats.map((d: any) => d.balance)],
  ];

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 30,
    styles: {
      fontSize: 9,
    },
  });

  doc.save(`door_attendance_${selectedDate || "report"}.pdf`);
};

export const exportAuditTrailCSV = (fileName: string, data: any[]) => {
  if (!data?.length) return;

  const mapped: any[] = data.map((item) => ({
    "Log ID": item.id,
    "Module / Table": item.tableName,
    Action: item.action,

    "Performed By": item.username || item.userId || "System",

    // 🔥 FULL RAW JSON IN ONE CELL
    "Old Data": item.oldData
  ? JSON.stringify(item.oldData).replace(/"/g, '""')
  : "-",

"New Data": item.newData
  ? JSON.stringify(item.newData).replace(/"/g, '""')
  : "-",

    Timestamp: item.createdAt || "-",
  }));

  const headers = Object.keys(mapped[0]) as string[];

  const rows = mapped.map((row) =>
    headers.map((key) => `"${row[key] ?? ""}"`)
  );

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows].map((r) => r.join(",")).join("\n");

  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `${fileName}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const formatJson = (val: any) => {
  if (!val) return "-";
  return JSON.stringify(val, null, 2);
};

export const exportAuditTrailPDF = (fileName: string, data: any[]) => {
  if (!data?.length) return;

  const doc = new jsPDF({
    orientation: "landscape", // 🔥 important for wide JSON
  });

  const mapped: any[] = data.map((item) => ({
    "Log ID": item.id || "-",
    "Module / Table": item.tableName || "-",
    Action: item.action || "-",
    "Performed By": item.username || item.userId || "System",

    "Old Data": formatJson(item.oldData),
    "New Data": formatJson(item.newData),

    Timestamp: item.createdAt || "-",
  }));

  const headers = [Object.keys(mapped[0])];

  const body = mapped.map((row) =>
    Object.keys(mapped[0]).map((key) => String(row[key] ?? ""))
  );

  doc.setFontSize(14);
  doc.text(fileName.replaceAll("_", " "), 14, 15);

  autoTable(doc, {
    head: headers,
    body,
    startY: 25,

    styles: {
      fontSize: 7,
      cellWidth: "wrap",      // 🔥 important
      overflow: "linebreak",  // 🔥 important
      valign: "top",
    },

    columnStyles: {
      0: { cellWidth: 18 }, // Log ID
      1: { cellWidth: 25 }, // Module
      2: { cellWidth: 18 }, // Action
      3: { cellWidth: 25 }, // Performed By
      4: { cellWidth: 70 }, // Old Data
      5: { cellWidth: 70 }, // New Data
      6: { cellWidth: 35 }, // Timestamp
    },

    didParseCell: (data) => {
      // 🔥 ensures proper wrapping for JSON
      if (data.column.index === 4 || data.column.index === 5) {
        data.cell.styles.fontSize = 6;
      }
    },
  });

  doc.save(`${fileName}.pdf`);
};

export const exportLoginSessionCSV = (fileName: string, data: any[]) => {
  if (!data?.length) return;

  const mapped: any[] = data.map((item) => ({
    Username: item.username || "System",
    "IP Address": item.ipAddress || "-",
    Status: item.status || "-",
    "Login Time": item.createdAt || "-",
    "Logout Time": item.logoutAt || "ACTIVE SESSION",
  }));

  const headers = Object.keys(mapped[0]) as string[];

  const rows = mapped.map((row) =>
    headers.map((key) => `"${row[key] ?? ""}"`)
  );

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows].map((r) => r.join(",")).join("\n");

  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `${fileName}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportLoginSessionPDF = (fileName: string, data: any[]) => {
  if (!data?.length) return;

  const doc = new jsPDF();

  const mapped: any[] = data.map((item) => ({
    Username: item.username || "System",
    "IP Address": item.ipAddress || "-",
    Status: item.status || "-",
    "Login Time": item.createdAt || "-",
    "Logout Time": item.logoutAt || "ACTIVE SESSION",
  }));

  const headers = [Object.keys(mapped[0])];

  const body = mapped.map((row) =>
    Object.keys(mapped[0]).map((key) => String(row[key] ?? ""))
  );

  doc.setFontSize(14);
  doc.text(fileName.replaceAll("_", " "), 14, 15);

  autoTable(doc, {
    head: headers,
    body,
    startY: 25,
    styles: { fontSize: 8 },
  });

  doc.save(`${fileName}.pdf`);
};

export const exportRolePermissionMatrixCSV = (
  fileName: string,
  role: any
) => {
  if (!role?.permissions?.length) return;

  const rows = role.permissions
  .filter((p: any) => p.menuTitle)
  .map((p: any, index: number) => ({
    "Role Name": index === 0 ? role.roleName : "",
    "Role Code": index === 0 ? role.code : "",

    "Menu Name": p.menuTitle,
    "Menu Code": p.menuCode,

    View: p.view ? "true" : "false",
    Add: p.add ? "true" : "false",
    Edit: p.edit ? "true" : "false",
    Delete: p.delete ? "true" : "false",
    Print: p.print ? "true" : "false",
    Export: p.export ? "true" : "false",
  }));

  const headers = Object.keys(rows[0]);

  const csvRows = rows.map((row: any) =>
    headers.map((key) => `"${row[key] ?? ""}"`)
  );

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...csvRows].map((r) => r.join(",")).join("\n");

  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `${fileName}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function exportVisitorLogsCSV(data: any[]) {
  try {
    if (!Array.isArray(data) || !data.length) return;

    // 1. Headers set karein
    const headers = ["Visitor Code", "Device ID", "Command", "Status", "Log Date"];

    // 2. Rows ka data extract aur format karein (comma separated)
    const rows = data.map((log: any) => {
      const visitorCode = log.visitorCardCode || "-";
      const deviceId = log.deviceId || "-";
      const command = log.command || "-";
      const status = log.status || "-";
      const logDate = log.syncDate ? new Date(log.syncDate).toLocaleString() : "-";

      // Excel safe banane ke liye values ko quotes "" me wrap kar dete hain
      return `"${visitorCode}","${deviceId}","${command}","${status}","${logDate}"`;
    });

    // Headers aur Rows ko merge karke full string banayein
    const csvContent = [headers.join(","), ...rows].join("\n");

    // 3. Blob create karke user ko file download karwayein
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.setAttribute("download", "Visitor_Access_Logs_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Visitor Logs CSV Export Error:", err);
  }
}

export function exportVisitorLogsPDF(data: any[]) {
  try {
    if (!Array.isArray(data) || !data.length) return;

    // 1. Headers Define Karein
    const headers = ["Visitor Code", "Device ID", "Command", "Status", "Log Date"];

    // 2. Rows me data map karein aur format karein
    const rows = data.map((log: any) => [
      log.visitorCardCode || "-",
      log.deviceId || "-",
      log.command || "-",
      log.status || "-",
      log.syncDate ? new Date(log.syncDate).toLocaleString() : "-",
    ]);

    // 3. jsPDF Initialize karein (Portrait, A4 size iske liye best hai)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Title styling
    doc.setFontSize(16);
    doc.text("Visitor Access Logs Report", 14, 15);

    // 4. AutoTable Configuration
    autoTable(doc, {
      startY: 23,
      head: [headers],
      body: rows,
      styles: {
        fontSize: 9, // Font size thoda clear rakha hai kyunki space kafi hai
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185], // Same Blue theme jo aapka OT Summary me tha
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      theme: "grid",
    });

    // PDF Save karein
    doc.save("Visitor_Access_Logs_Report.pdf");
  } catch (err) {
    console.error("Visitor Logs PDF Export Error:", err);
  }
}

export async function exportContractorsCSV(currentAppliedFilters: any) {
  try {
    const params = new URLSearchParams();

    // 1. Saare active filters (jaise search parameter) ko append karo
    Object.entries(currentAppliedFilters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "_refresh") {
        params.append(k, String(v));
      }
    });

    // 🌟 MAGIC LOGIC: Page ko hamesha 1 rakho taaki shuruat se data mile,
    // Aur pageSize ko itna bada kar do taaki filter hone ke baad jitne bhi records hain (jaise 30 ya 40),
    // Woh sab ke sab ek hi page ke andar fetch ho jayein, agle pages par break na ho!
    params.set("page", "1");
    params.set("pageSize", "100000"); 

    const res = await fetch(`/api/contractors?${params.toString()}`);

    if (!res.ok) {
      throw new Error("Contractor CSV export fetch failed");
    }

    const apiResponse = await res.json();

    // 🌟 Safe Array Extraction: Check karo agar backend pagination wrapper me data bhej raha hai
    // Jaise { data: [...] } ya { rows: [...] } ya direct array
    let reportData = [];
    if (Array.isArray(apiResponse)) {
      reportData = apiResponse;
    } else if (apiResponse?.data && Array.isArray(apiResponse.data)) {
      reportData = apiResponse.data;
    } else if (apiResponse?.contractors && Array.isArray(apiResponse.contractors)) {
      reportData = apiResponse.contractors;
    } else {
      reportData = apiResponse || [];
    }

    if (!reportData.length) {
      console.warn("No data available to export for current filters");
      return;
    }

    // 2. DYNAMIC COLUMN DETECTION (id aur createdAt ko skip karna hai)
    const sampleRecord = reportData[0];
    const excludedFields = ["id", "createdAt", "created_at"];
    
    const dynamicHeaders = Object.keys(sampleRecord).filter(
      (key) => !excludedFields.includes(key)
    );

    // CSV Headers Setup
    const csvHeaders = dynamicHeaders.map((header) => {
      const cleanTitle = header
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
      return `"${cleanTitle.replace(/"/g, '""')}"`;
    });

    // 3. Row data mapping
    const csvRows = reportData.map((record: any) => {
      return dynamicHeaders.map((header) => {
        let val = record[header];
        if (val === undefined || val === null || val === "") return '""';
        
        if (typeof val === "string" && (header.toLowerCase().includes("date") || header.toLowerCase().includes("upto"))) {
          val = val.split("T")[0];
        }

        const escapedVal = String(val).replace(/"/g, '""');
        return `"${escapedVal}"`;
      }).join(",");
    });

    // 4. Combine and Download
    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Contractors_Filtered_Report_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Contractor CSV Export Error:", err);
  }
}

