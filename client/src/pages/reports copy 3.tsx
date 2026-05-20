import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime, formatTime } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Clock,
  AlertTriangle,
  Search,
  Download,
  Filter,
  RefreshCw,
  DoorOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { type Person } from "@shared/schema";
import React from "react";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";
// 1. Updated Report Configuration
const reportTypes = [
  {
    id: "attendance",
    label: "Attendance",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    description: "Daily attendance records with clock in/out times",
  },
  {
    id: "access-logs",
    label: "Access Logs",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    description: "Daily access logs of employees with door details",
  },
  {
    id: "daily-performance",
    label: "Monthly Performance",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    description: "Daily Performance records of Employees",
  },
  {
    id: "daily-efficiency", // ✅ FIX
    label: "Daily Efficiency",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    description: "Daily Efficiency records of Employees",
  },
  {
    id: "monthly-efficiency", // ✅ FIX
    label: "Monthly Efficiency",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    description: "Monthly Efficiency records of Employees",
  },
  {
    id: "department",
    label: "Department",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    description: "Department Wise Manpower and OT Report",
  },
  {
    id: "cabin-lockout", // Cefalo replaced with Lockout
    label: "Cabin Lockout",
    icon: AlertTriangle,
    color: "text-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
    description: "Real-time employee cabin block and lockout status",
  },
];
function formatHours(h: string | number | undefined) {
  if (h === null || h === undefined || h === "0.00") return "-";
  return `${Number(h).toFixed(1)}h`;
}
function statusBadge(status: string) {
  const styles: Record<string, string> = {
    present:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    late: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    absent: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  };
  return (
    <Badge
      className={`text-[10px] shadow-none border-none ${styles[status?.toLowerCase()] || "bg-muted text-muted-foreground"}`}
    >
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}
const filterConfig: Record<string, string[]> = {
  attendance: ["dateFrom", "dateTo", "employeeCode", "status"],
  "access-logs": ["dateFrom", "dateTo", "employeeCode", "deviceId"],
  "daily-performance": [
    "dateFrom",
    "dateTo",
    "employeeCode",
    "deviceId",
    "status",
  ],
  "daily-efficiency": ["date", "employeeCode", "deviceId", "status"],
  "monthly-efficiency": ["dateFrom", "dateTo", "employeeCode"],
  department: ["dateFrom", "dateTo"],
  "cabin-lockout": ["dateFrom", "dateTo", "employeeCode", "deviceId"],
};
function getCurrentMonthDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return {
    dateFrom: format(firstDay),
    dateTo: format(today),
  };
}
function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date();
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return {
    dateFrom: format(firstDay),
    dateTo: format(today),
  };
}
export function exportDailyEfficiencyCSV(apiResponse: any, doors: any[]) {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.REPORTS.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  // Backend response se data nikaalna
  const reportData = apiResponse?.data || apiResponse || [];
  if (!Array.isArray(reportData) || !reportData.length) return;
  const formatTimeCSV = (time: any) => {
    if (!time || time === "-") return "-";
    const d = new Date(time);
    if (isNaN(d.getTime())) return String(time);
    return d
      .toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };
  const rows: any[] = [];
  reportData.forEach((r) => {
    // 1. Grouping Logic: Har door ke liye multiple entries collect karna
    const groupedDoors: Record<string, { in: string[]; out: string[] }> = {};
    (r.movementDetails || []).forEach((m: any) => {
      // Backend se doorName "PT" ya "Main Gate" aata hai
      const key = String(m.doorName || "")
        .trim()
        .toLowerCase();
      if (!groupedDoors[key]) {
        groupedDoors[key] = { in: [], out: [] };
      }
      if (m.inTime) groupedDoors[key].in.push(formatTimeCSV(m.inTime));
      if (m.outTime) groupedDoors[key].out.push(formatTimeCSV(m.outTime));
    });
    // 2. Door Mapping: Multiple timings ko join karna (New Line ke saath)
    const doorValues = doors.flatMap((d) => {
      const key = String(d.DeviceName || d.name || "")
        .trim()
        .toLowerCase();
      const doorData = groupedDoors[key];
      // Join with "\n" taaki Excel cell me ek ke niche ek dikhe
      return [
        doorData?.in?.length ? doorData.in.join("\n") : "-",
        doorData?.out?.length ? doorData.out.join("\n") : "-",
      ];
    });
    // 3. Calculation Check
    const prodHrs = parseFloat(r.productiveHours || "0");
    const presHrs = parseFloat(r.totalPresenceHours || "0");
    const efficiency =
      r.efficiency ||
      (prodHrs > 0 ? `${Math.round((prodHrs / 9) * 100)}%` : "0%");
    // 4. Row Push
    rows.push([
      r.employeeCode || "-",
      r.employeeName || "-",
      r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-",
      ...doorValues,
      `${presHrs.toFixed(2)}h`,
      `${prodHrs.toFixed(2)}h`,
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
  // 5. CSV Logic: Double quotes (escapeCSV) bahut zaroori hain multi-line data ke liye
  const escapeCSV = (val: any) => `"${String(val).replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Daily_Efficiency_Report.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function exportDailyPerformanceCSV(data: any[]) {
  if (!Array.isArray(data) || !data.length) return;
  const headers = [
    "Employee Name",
    "Gender",
    "Log Date",
    "Latest Punch Door",
    "Shift",
    "Shift Time",
    "In Punch",
    "Out Punch",
    "Hours Worked",
    "Duty Status",
    "OT Hrs",
  ];
  const formatHours = (val: any) => {
    if (!val && val !== 0) return "0h";
    const num = Number(val);
    if (isNaN(num)) return "0h";
    return `${num.toFixed(2)}h`;
  };
  const rows = data.map((r) => [
    r.employeeName || "-",
    r.gender || "-",
    r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-",
    r.latestPunchDoor || "-",
    r.shift || "-",
    r.shiftTime || "-",
    formatTime(r.inPunch),
    formatTime(r.outPunch),
    formatHours(r.hoursWorked),
    r.dutyStatus || "-",
    formatHours(r.otHours),
  ]);
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };
  const csv =
    headers.map(escapeCSV).join(",") +
    "\n" +
    rows.map((r) => r.map(escapeCSV).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "daily-performance-details.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function exportMonthlyStatusCSV(data: any[], daysInMonth: number) {
  if (!data.length) return;
  const grouped: Record<string, any> = {};
  data.forEach((r) => {
    const key = r.employeeName;
    if (!grouped[key]) {
      grouped[key] = {
        employeeName: r.employeeName,
        days: {},
        present: 0,
        absent: 0,
        off: 0,
      };
    }
    const date = new Date(r.workDate).getDate();
    const status = (r.attendanceStatus || "").toLowerCase();
    grouped[key].days[date] = status;
    if (status === "present") grouped[key].present++;
    else if (status === "absent") grouped[key].absent++;
    else grouped[key].off++;
  });
  const employees = Object.values(grouped);
  // 🔥 HEADER dynamic
  const headers = [
    "Employee Name",
    ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),
    "Present",
    "Off",
    "Absent",
    "Total Days",
  ];
  const rows = employees.map((emp: any) => {
    const totalDays = emp.present + emp.absent + emp.off;
    const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const status = emp.days[d];
      if (status === "present") return "P";
      if (status === "absent") return "A";
      if (status === "off") return "O";
      return "-";
    });
    return [
      emp.employeeName,
      ...dayValues,
      emp.present,
      emp.off,
      emp.absent,
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
}
function exportOTSummaryCSV(data: any[], daysInMonth: number) {
  if (!data.length) return;
  const grouped: Record<string, any> = {};
  data.forEach((r) => {
    const key = r.employeeName;
    if (!grouped[key]) {
      grouped[key] = {
        employeeName: r.employeeName,
        days: {},
        totalHrs: 0,
      };
    }
    const date = new Date(r.workDate).getDate();
    const otMinutes = Number(r.overtimeMinutes || 0);
    const otHours = otMinutes / 60;
    // 🔥 same as table logic
    grouped[key].days[date] = otHours;
    grouped[key].totalHrs += otHours;
  });
  const employees = Object.values(grouped);
  // 🔥 HEADER
  const headers = [
    "Employee Name",
    ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),
    "Total Hours",
  ];
  const rows = employees.map((emp: any) => {
    const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const hrs = emp.days[d];
      return hrs !== undefined ? Number(hrs).toFixed(0) : "0";
    });
    return [
      emp.employeeName,
      ...dayValues,
      Number(emp.totalHrs || 0).toFixed(0),
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
}
function ReportFilters({
  filters,
  setFilters,
  setAppliedFilters,
  onApply,
  people,
  devices,
  activeReport, // 👈 ADD
}: {
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  setAppliedFilters: (f: Record<string, string>) => void;
  onApply: () => void;
  people: Person[];
  devices: any[];
  activeReport: string; // 👈 ADD
}) {
  const allowed = filterConfig[activeReport] || [];
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Report Filters
          </span>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* 🔥 GRID WRAPPER IMPORTANT */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
            {/* FROM DATE */}
            {/* DAILY EFFICIENCY → SINGLE DATE */}
            {activeReport === "daily-efficiency" && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  DATE
                </Label>
                <Input
                  type="date"
                  value={filters.date || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, date: e.target.value })
                  }
                />
              </div>
            )}
            {/* OTHER REPORTS → FROM DATE */}
            {activeReport !== "daily-efficiency" &&
              allowed.includes("dateFrom") && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    FROM DATE
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, dateFrom: e.target.value })
                    }
                  />
                </div>
              )}
            {/* OTHER REPORTS → TO DATE */}
            {activeReport !== "daily-efficiency" &&
              allowed.includes("dateTo") && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    TO DATE
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, dateTo: e.target.value })
                    }
                  />
                </div>
              )}
            {/* EMPLOYEE */}
            {allowed.includes("employeeCode") && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  EMPLOYEE
                </Label>
                <Select
                  value={filters.employeeCode || "all"}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      employeeCode: v === "all" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={String(p.employeeCode)}>
                        {p.employeeName}{" "}
                        {p.employeeCode ? `(${p.employeeCode})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* DEVICE */}
            {allowed.includes("deviceId") && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  DOOR / DEVICE
                </Label>
                <Select
                  value={filters.deviceId || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, deviceId: v === "all" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Doors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doors</SelectItem>
                    {devices?.map((d) => (
                      <SelectItem
                        key={d.id || d.DeviceId}
                        value={String(d.DeviceId || d.id)}
                      >
                        {d.DeviceName || d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* STATUS */}
            {allowed.includes("status") && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  STATUS
                </Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, status: v === "all" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {/* BUTTONS */}
          <div className="flex gap-2 shrink-0">
            <Button onClick={onApply} size="sm" className="px-5 shadow-sm">
              <Search className="w-4 h-4 mr-2" />
              Apply
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilters({});
                setAppliedFilters({});
              }}
              className="px-5"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ); // return close
}
function AttendanceTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium">Employee</th>
            <th className="text-left p-3 font-medium">Emp Code</th>
            <th className="text-left p-3 font-medium">Date</th>
            <th className="text-left p-3 font-medium">Clock In</th>
            {/* <th className="text-left p-3 font-medium">Out</th> */}
            <th className="text-left p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
              <td className="p-3 font-medium">
                {r.firstName || r.employeeName}
              </td>
              <td className="p-3 text-muted-foreground">
                {r.employeeCode || "-"}
              </td>
              <td className="p-3">{r.date}</td>
              <td className="p-3 font-medium text-emerald-600">
                {formatTime(r.clockIn)}
              </td>
              {/* <td className="p-3 font-medium text-blue-600">
                {formatTime(r.clockOut)}
              </td> */}
              <td className="p-3">{statusBadge(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function AccessLogs({ data }: { data: any[] }) {
  return (
    // 'max-h-[500px]' ya koi bhi fix height set karein aur 'overflow-y-auto' add karein
    <div className="overflow-x-auto overflow-y-auto max-h-[600px] border rounded-md">
      <table className="w-full text-xs">
        {/* 'sticky top-0' use karein taki scroll karte waqt header upar hi rahe */}
        <thead className="sticky top-0 z-10">
          <tr className="border-b bg-muted/90 backdrop-blur-sm">
            <th className="p-3 text-left">Device Log ID</th>
            <th className="p-3 text-left">Employee Name</th>
            <th className="p-3 text-left">Employee Code</th>
            <th className="p-3 text-left">Department</th>
            <th className="p-3 text-left">Designation</th>
            <th className="p-3 text-left">Device ID</th>
            <th className="p-3 text-left">Door Name</th>
            <th className="p-3 text-left">Direction</th>
            <th className="p-3 text-left">Log Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/20">
              <td className="p-3 font-medium">
                {r.DeviceLogId || r.devicelogid || "-"}
              </td>
              <td className="p-3">
                {r.employee_name || r.employeeName || "-"}
              </td>
              <td className="p-3">{r.employeecode || r.employeeCode || "-"}</td>
              <td className="p-3">{r.department_name || "-"}</td>
              <td className="p-3">{r.designation_name || "-"}</td>
              <td className="p-3">{r.deviceid || r.DeviceId || "-"}</td>
              <td className="p-3">{r.door_name || r.DoorName || "-"}</td>
              <td className="p-3">{r.direction || "-"}</td>
              <td className="p-3">
                {r.logdate || r.LogDate
                  ? formatDateTime(r.logdate || r.LogDate).toLocaleString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function DaliyPerformanceTable({ data }: { data?: any[] }) {
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-xs">
        {/* ✅ HEADER ALWAYS */}
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium">Employee Name</th>
            <th className="text-left p-3 font-medium">Gender</th>
            <th className="text-left p-3 font-medium">Log Date</th>
            <th className="text-left p-3 font-medium">Latest Punch Door</th>
            <th className="text-left p-3 font-medium">Shift</th>
            <th className="text-left p-3 font-medium">Shift Time</th>
            <th className="text-left p-3 font-medium">In Punch</th>
            <th className="text-left p-3 font-medium">Out Punch</th>
            <th className="text-left p-3 font-medium">Hours Worked</th>
            <th className="text-left p-3 font-medium">Duty Status</th>
            <th className="text-left p-3 font-medium">OT Hrs</th>
          </tr>
        </thead>
        <tbody>
          {safeData.length > 0 ? (
            safeData.map((r) => (
              <tr key={`${r.employeeCode}-${r.date}`} className="border-b">
                <td className="p-3">{r.employeeName || "-"}</td>
                <td className="p-3">{r.gender || "-"}</td>
                <td className="p-3">
                  {r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-"}
                </td>
                <td className="p-3">{r.latestPunchDoor || "-"}</td>
                <td className="p-3">{r.shift || "-"}</td>
                <td className="p-3">{r.shiftTime || "-"}</td>
                <td className="p-3 font-mono text-blue-600 dark:text-blue-400">
                  {formatTime(r.inPunch)}
                </td>
                <td className="p-3 font-mono text-orange-600 dark:text-orange-400">
                  {formatTime(r.outPunch)}
                </td>
                <td className="p-3">
                  {r.hoursWorked
                    ? `${Number(r.hoursWorked).toFixed(2)}h`
                    : "0h"}
                </td>
                <td className="p-3">{r.dutyStatus || "-"}</td>
                <td className="p-3">
                  {r.otHours ? `${Number(r.otHours).toFixed(2)}h` : "0h"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={10} className="p-3 text-center">
                No Data Found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function DaliyPerformanceSummaryTable({
  data,
  daysInMonth,
}: {
  data: any[];
  daysInMonth: number;
}) {
  const safeData = Array.isArray(data) ? data : [];
  // 🔥 Group by employee
  const grouped: Record<string, any> = {};
  safeData.forEach((r) => {
    const key = r.employeeName;
    if (!grouped[key]) {
      grouped[key] = {
        employeeName: r.employeeName,
        perDayRate: r.perDayRate || 0,
        days: {},
        present: 0,
        absent: 0,
        off: 0,
      };
    }
    const date = new Date(r.workDate).getDate(); // 🔥 FIX
    const status = (r.attendanceStatus || "").toLowerCase(); // 🔥 FIX
    grouped[key].days[date] = status;
    if (status === "present") grouped[key].present++;
    else if (status === "absent") grouped[key].absent++;
    else grouped[key].off++;
  });
  const employees = Object.values(grouped);
  return (
    <div className="overflow-x-auto border rounded-md mt-6">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="p-2">Employee Name</th>
            {/* <th className="p-2">Rate</th> */}
            {/* 🔥 1–31 columns */}
            {Array.from({ length: daysInMonth }, (_, i) => (
              <th key={i} className="p-2 text-center">
                {i + 1}
              </th>
            ))}
            <th className="p-2">Present</th>
            {/* <th className="p-2">Pay</th> */}
            <th className="p-2">Off</th>
            <th className="p-2">Absent</th>
            <th className="p-2">Days</th>
          </tr>
        </thead>
        <tbody>
          {employees.length > 0 ? (
            employees.map((emp: any, idx) => {
              // const totalDays = emp.present + emp.absent + emp.off;
              const today = new Date().getDate();
              const dynamicAbsent = Array.from(
                { length: daysInMonth },
                (_, i) => i + 1,
              ).filter((d) => d < today && !emp.days[d]).length;
              const finalAbsent = emp.absent + dynamicAbsent;
              const totalDays = emp.present + emp.off + finalAbsent;
              const totalPay = emp.present * emp.perDayRate;
              return (
                <tr key={idx} className="border-b">
                  <td className="p-2 font-medium">{emp.employeeName}</td>
                  {/* <td className="p-2">{emp.perDayRate}</td> */}
                  {/* 🔥 Day cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const status = emp.days[day];
                    return (
                      <td
                        key={i}
                        className="text-center p-1 border border-gray-300 text-[10px] w-8 h-8"
                      >
                        {status === "present" && (
                          <span className="text-emerald-600 font-bold">P</span>
                        )}
                        {status === "absent" && (
                          <span className="text-rose-600 font-bold">A</span>
                        )}
                        {status === "off" && (
                          <span className="text-amber-600 font-bold">O</span>
                        )}
                        {!status &&
                          (() => {
                            const today = new Date().getDate();
                            // past dates => Absent
                            if (day < today) {
                              return (
                                <span className="text-rose-600 font-bold">
                                  A
                                </span>
                              );
                            }
                            // future/current dates => -
                            return <span className="text-gray-400">-</span>;
                          })()}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">{emp.present}</td>
                  {/* <td className="p-2 text-center font-bold text-emerald-600">
                    ₹{totalPay}
                  </td> */}
                  <td className="p-2 text-center">{emp.off}</td>
                  {/* <td className="p-2 text-center">{emp.absent}</td> */}
                  <td className="p-2 text-center">{finalAbsent}</td>
                  <td className="p-2 text-center">{totalDays}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={40}
                className="text-center py-6 text-muted-foreground"
              >
                No summary data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function DaliyPerformanceOvertimeSummaryTable({
  data,
  daysInMonth,
}: {
  data: any[];
  daysInMonth: number;
}) {
  const safeData = Array.isArray(data) ? data : [];
  // 🔥 Group by employee
  const grouped: Record<string, any> = {};
  safeData.forEach((r) => {
    const key = r.employeeName;
    if (!grouped[key]) {
      grouped[key] = {
        employeeName: r.employeeName,
        days: {},
        totalWorkingHrs: 0,
      };
    }
    // ✅ FIX
    const date = new Date(r.date || r.workDate).getDate();
    // ✅ employee-productive-report se
    const otHours = Number(r.otHours || 0);
    grouped[key].days[date] = otHours;
    grouped[key].totalWorkingHrs += otHours;
  });
  const employees = Object.values(grouped);
  return (
    <div className="overflow-x-auto border rounded-md mt-6">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="p-2 text-left">Employee Name</th>
            {/* <th className="p-2 text-center">Per Day Rate</th> */}
            {/* 🔥 1–31 columns */}
            {Array.from({ length: daysInMonth }, (_, i) => (
              <th key={i} className="p-1 text-center border-x w-8">
                {i + 1}
              </th>
            ))}
            <th className="p-2 text-center bg-primary/5 font-bold">
              Total Hrs
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.length > 0 ? (
            employees.map((emp: any, idx) => {
              return (
                <tr key={idx} className="border-b hover:bg-muted/10">
                  <td className="p-2 font-medium">{emp.employeeName}</td>
                  {/* <td className="p-2 text-center">₹{emp.perDayRate}</td> */}
                  {/* 🔥 Day cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const hours = emp.days[day]; // 🔥 OT hours
                    return (
                      <td
                        key={i}
                        className="text-center p-1 border-x text-[10px]"
                      >
                        <span
                          className={`${Number(hours) > 0
                              ? "text-green-600 font-bold"
                              : "text-black font-normal"
                            }`}
                        >
                          {hours !== undefined ? Number(hours).toFixed(0) : 0}
                        </span>
                      </td>
                    );
                  })}
                  {/* 🔥 Total Hours Column */}
                  <td className="p-2 text-center font-bold bg-primary/5 text-primary">
                    {Number(emp.totalWorkingHrs || 0)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={34}
                className="text-center py-6 text-muted-foreground"
              >
                No summary data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function getShiftHours(shiftTime?: string) {
  if (!shiftTime) return 0;
  const [start, end] = shiftTime.split("-").map((t) => t.trim());
  if (!start || !end) return 0;
  const parseTime = (t: string) => {
    const [time, modifier] = t.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours + minutes / 60;
  };
  return parseTime(end) - parseTime(start);
}
function DailyEfficiencyTable({ data, doors }: { data?: any[]; doors: any[] }) {
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-max min-w-full text-xs">
        {/* 🔥 HEADER */}
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium whitespace-nowrap">
              Employee Code
            </th>
            <th className="text-left p-3 font-medium whitespace-nowrap">
              Employee Name
            </th>
            <th className="text-left p-3 font-medium whitespace-nowrap">
              Log Date
            </th>
            {/* 🔥 DYNAMIC DOORS */}
            {doors.map((d, i) => (
              <React.Fragment key={i}>
                <th className="text-center p-3 font-medium">
                  {d.DeviceName || d.name} IN
                </th>
                <th className="text-center p-3 font-medium">
                  {d.DeviceName || d.name} OUT
                </th>
              </React.Fragment>
            ))}
            <th className="text-left p-3 font-medium whitespace-nowrap">
              Total Time
            </th>
            <th className="text-left p-3 font-medium whitespace-nowrap">
              Productive Time
            </th>
            <th className="text-left p-3 font-medium whitespace-nowrap">
              Efficiency %
            </th>
          </tr>
        </thead>
        {/* 🔥 BODY */}
        <tbody>
          {safeData.length > 0 ? (
            safeData.map((r, i) => {
              // 🔥 GROUP DOOR ENTRIES
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
                groupedDoors[key].in.push(
                  m.inTime ? formatTime(m.inTime) : "-",
                );
                groupedDoors[key].out.push(
                  m.outTime ? formatTime(m.outTime) : "-",
                );
              });
              const shiftHours = getShiftHours(r.shiftTime);
              return (
                <tr
                  key={`${r.employeeCode}-${i}`}
                  className="border-b hover:bg-muted/20"
                >
                  <td className="p-3">{r.employeeCode || "-"}</td>
                  <td className="p-3">{r.employeeName || "-"}</td>
                  <td className="p-3">
                    {r.date
                      ? new Date(r.date).toLocaleDateString("en-GB")
                      : "-"}
                  </td>
                  {/* 🔥 DOOR COLUMNS */}
                  {doors.map((d, j) => {
                    const key = String(d.DeviceName || d.name || "")
                      .trim()
                      .toLowerCase();
                    const doorData = groupedDoors[key];
                    return (
                      <React.Fragment key={j}>
                        {/* IN */}
                        <td className="text-center p-3 align-top">
                          {doorData?.in?.length ? (
                            <div className="flex flex-col gap-1">
                              {doorData.in.map((time: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-blue-600 dark:text-blue-400"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        {/* OUT */}
                        <td className="text-center p-3 align-top">
                          {doorData?.out?.length ? (
                            <div className="flex flex-col gap-1">
                              {doorData.out.map((time: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-orange-600 dark:text-orange-400"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {/* TOTAL TIME */}
                  <td className="text-center p-3">
                    {r.totalPresenceHours
                      ? `${Number(r.totalPresenceHours).toFixed(2)}h`
                      : "-"}
                  </td>
                  {/* PRODUCTIVE TIME */}
                  <td className="text-center p-3">
                    {r.productiveHours
                      ? `${Number(r.productiveHours).toFixed(2)}h`
                      : "-"}
                  </td>
                  {/* EFFICIENCY */}
                  <td className="text-center p-3 font-semibold">
                    {Number(r.totalPresenceMinutes || 0) > 0
                      ? `${(
                        (Number(r.productiveMinutes || 0) /
                          Number(r.totalPresenceMinutes || 0)) *
                        100
                      ).toFixed(2)}%`
                      : "-"}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={doors.length * 2 + 5}
                className="text-center py-6 text-muted-foreground"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function DepartmentWiseManpowerTable({
  data,
  departments,
}: {
  data?: any[];
  departments: any[];
}) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-max min-w-full text-xs border-collapse">
        {/* 🔥 HEADER */}
        <thead>
          {/* TOP HEADER */}
          <tr className="border-b bg-muted/30">
            <th rowSpan={2} className="border p-3 text-left whitespace-nowrap">
              Employee Code
            </th>

            <th rowSpan={2} className="border p-3 text-left whitespace-nowrap">
              Employee Name
            </th>

            <th
              rowSpan={2}
              className="border p-3 text-center whitespace-nowrap"
            >
              Per Day Rate
            </th>

            <th rowSpan={2} className="border p-3 text-left whitespace-nowrap">
              Contractor Name
            </th>

            {/* 🔥 DYNAMIC DEPARTMENTS */}
            {departments.map((dept, i) => (
              <th
                key={i}
                colSpan={2}
                className="border p-3 text-center whitespace-nowrap"
              >
                {dept.departmentName || dept.name}
              </th>
            ))}

            <th
              colSpan={2}
              className="border p-3 text-center whitespace-nowrap"
            >
              Total Working
            </th>

            <th
              colSpan={2}
              className="border p-3 text-center whitespace-nowrap"
            >
              Amount
            </th>

            <th
              rowSpan={1}
              colSpan={1}
              className="border p-3 text-center whitespace-nowrap"
            >
              Total Wages
            </th>
          </tr>

          {/* SUB HEADER */}
          <tr className="border-b bg-muted/20">
            {/* 🔥 DYNAMIC SUB COLUMNS */}
            {departments.map((_, i) => (
              <React.Fragment key={i}>
                <th className="border p-2 text-center whitespace-nowrap">
                  No. of Duty
                </th>

                <th className="border p-2 text-center whitespace-nowrap">
                  OT Hrs.
                </th>
              </React.Fragment>
            ))}

            {/* TOTAL WORKING */}
            <th className="border p-2 text-center whitespace-nowrap">
              No. of Duty
            </th>

            <th className="border p-2 text-center whitespace-nowrap">
              OT Hrs.
            </th>

            {/* AMOUNT */}
            <th className="border p-2 text-center whitespace-nowrap">
              Duty Amt.
            </th>

            <th className="border p-2 text-center whitespace-nowrap">
              OT Amt.
            </th>

            {/* TOTAL */}
            <th className="border p-2 text-center whitespace-nowrap">
              Duty & OT
            </th>
          </tr>
        </thead>

        {/* 🔥 BODY */}
        <tbody>
          {safeData.length > 0 ? (
            safeData.map((r, i) => {
              // 🔥 GROUP DEPARTMENT DATA
              const groupedDepartments: Record<
                string,
                {
                  duty: number;
                  otHours: number;
                }
              > = {};

              (r.departmentDetails || []).forEach((d: any) => {
                const key = String(
                  d.departmentName || d.name || "",
                ).toLowerCase();

                groupedDepartments[key] = {
                  duty: Number(d.noOfDuty || 0),
                  otHours: Number(d.otHours || 0),
                };
              });

              // 🔥 TOTALS
              let totalDuty = 0;
              let totalOT = 0;

              departments.forEach((dept) => {
                const key = String(
                  dept.departmentName || dept.name || "",
                ).toLowerCase();

                totalDuty += groupedDepartments[key]?.duty || 0;
                totalOT += groupedDepartments[key]?.otHours || 0;
              });

              const perDayRate = Number(r.perDayRate || 0);

              const dutyAmount = totalDuty * perDayRate;
              const otAmount = totalOT * (perDayRate / 8);
              const totalWages = dutyAmount + otAmount;

              return (
                <tr
                  key={`${r.employeeCode}-${i}`}
                  className="border-b hover:bg-muted/20"
                >
                  {/* BASIC INFO */}
                  <td className="border p-3">{r.employeeCode || "-"}</td>

                  <td className="border p-3">{r.employeeName || "-"}</td>

                  <td className="border p-3 text-center">
                    {perDayRate || "-"}
                  </td>

                  <td className="border p-3">{r.contractorName || "-"}</td>

                  {/* 🔥 DYNAMIC DEPARTMENT DATA */}
                  {departments.map((dept, j) => {
                    const key = String(
                      dept.departmentName || dept.name || "",
                    ).toLowerCase();

                    const deptData = groupedDepartments[key];

                    return (
                      <React.Fragment key={j}>
                        <td className="border p-3 text-center">
                          {deptData?.duty ?? 0}
                        </td>

                        <td className="border p-3 text-center">
                          {deptData?.otHours ?? 0}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* TOTAL WORKING */}
                  <td className="border p-3 text-center">
                    {totalDuty.toFixed(2)}
                  </td>

                  <td className="border p-3 text-center">
                    {totalOT.toFixed(2)}
                  </td>

                  {/* AMOUNTS */}
                  <td className="border p-3 text-center">
                    ₹{dutyAmount.toFixed(0)}
                  </td>

                  <td className="border p-3 text-center">
                    ₹{otAmount.toFixed(0)}
                  </td>

                  {/* TOTAL WAGES */}
                  <td className="border p-3 text-center font-semibold">
                    ₹{totalWages.toFixed(0)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={departments.length * 2 + 9}
                className="text-center py-6 text-muted-foreground"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function EmployeePerformanceTable({ data }: { data?: any[] }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-max min-w-full text-xs border-collapse">
        {/* HEADER */}
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="border p-3 text-left whitespace-nowrap">
              Employee Code
            </th>

            <th className="border p-3 text-left whitespace-nowrap">
              Employee Name
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Date Range
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Total Days
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Total Hours
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Productive Hours
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Avg. Efficiency %
            </th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {safeData.length > 0 ? (
            safeData.map((r, i) => {
              const totalDays = Number(r.totalDays || 0);
              const totalHours = Number(r.totalHours || 0);
              const productiveHours = Number(r.productiveHours || 0);

              const efficiency =
                totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

              return (
                <tr
                  key={`${r.employeeCode}-${i}`}
                  className="border-b hover:bg-muted/20"
                >
                  <td className="border p-3">{r.employeeCode || "-"}</td>

                  <td className="border p-3">{r.employeeName || "-"}</td>

                  <td className="border p-3 text-center whitespace-nowrap">
                    {r.dateRange
                      ? r.dateRange
                        .split(" to ")
                        .map((d: string) =>
                          new Date(d).toLocaleDateString("en-GB"),
                        )
                        .join(" To ")
                      : "-"}
                  </td>

                  <td className="border p-3 text-center">{totalDays}</td>

                  <td className="border p-3 text-center">
                    {totalHours.toFixed(2)}
                  </td>

                  <td className="border p-3 text-center">
                    {productiveHours.toFixed(2)}
                  </td>

                  <td className="border p-3 text-center font-semibold">
                    {efficiency.toFixed(2)}%
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={7}
                className="text-center py-6 text-muted-foreground"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function DepartmentEfficiencyTable({ data }: { data?: any[] }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-max min-w-full text-xs border-collapse">
        {/* HEADER */}
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="border p-3 text-left whitespace-nowrap">
              Department
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Date Range
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Total Manpower
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Total Man Hours
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Productive Hours
            </th>

            <th className="border p-3 text-center whitespace-nowrap">
              Avg. Efficiency %
            </th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {safeData.length > 0 ? (
            safeData.map((r, i) => {
              const manpower = Number(r.totalManpower || 0);
              const totalHours = Number(r.totalManHours || 0);
              const productiveHours = Number(r.productiveHours || 0);

              const efficiency =
                totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

              return (
                <tr
                  key={`${r.departmentName}-${i}`}
                  className="border-b hover:bg-muted/20"
                >
                  <td className="border p-3">{r.department || "-"}</td>

                  <td className="border p-3 text-center whitespace-nowrap">
                    {r.dateRange
                      ? r.dateRange
                        .split(" to ")
                        .map((d: string) =>
                          new Date(d).toLocaleDateString("en-GB"),
                        )
                        .join(" To ")
                      : "-"}
                  </td>

                  <td className="border p-3 text-center">{manpower}</td>

                  <td className="border p-3 text-center">
                    {totalHours.toFixed(2)}
                  </td>

                  <td className="border p-3 text-center">
                    {productiveHours.toFixed(2)}
                  </td>

                  <td className="border p-3 text-center font-semibold">
                    {efficiency.toFixed(2)}%
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={6}
                className="text-center py-6 text-muted-foreground"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function LockoutReportTable({ data }: { data: any[] }) {
  return (
    // ✅ Scroll bar aur height yahan fix ki hai
    <div className="relative overflow-x-auto overflow-y-auto max-h-[450px] scrollbar-thin scrollbar-thumb-muted-foreground/20">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10">
          {" "}
          {/* ✅ Sticky Header add kiya hai */}
          <tr className="border-b bg-white dark:bg-background">
            {" "}
            {/* Background dena zaruri hai sticky ke liye */}
            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
              Employee
            </th>
            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
              Cabin / Door
            </th>
            <th className="text-center p-4 font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
              Status
            </th>
            <th className="text-center p-4 font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
              Expiry Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.length > 0 ? (
            data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/40 hover:bg-muted/20 transition-colors"
              >
                <td className="p-4">
                  <div className="font-bold text-sm">{row.employeeName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {row.employeeCode}
                  </div>
                </td>
                <td className="p-4 font-semibold text-slate-700">
                  {row.doorName}
                </td>
                <td className="p-4 text-center">
                  {row.status === "active" ? (
                    <Badge className="bg-rose-500 hover:bg-rose-600 border-none text-[10px] px-3">
                      🔴 ACTIVE
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-[10px] px-3"
                    >
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-center font-mono text-muted-foreground">
                  {row.lockoutExpiry ? formatDateTime(row.lockoutExpiry) : "-"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-8 text-center text-muted-foreground">
                No lockout records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function getDaysInMonth(dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
// 4. Main Page Component
export default function ReportsPage() {
  const { canExport, canView } = usePermission(MENU_CONFIG.REPORTS.code);
  if (!canView) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to view reports.
        </p>
      </div>
    );
  }
  const [activeReport, setActiveReport] = useState("attendance");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [location] = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");
    if (tab) {
      const validTabs = [
        "attendance",
        "access-logs",
        "daily-performance",
        "daily-efficiency",
        "department",
        "cabin-lockout",
      ];
      if (validTabs.includes(tab)) {
        setActiveReport(tab);
        // 🔥 DEFAULT FILTER APPLY KAR
        if (tab === "daily-performance") {
          const defaultRange = getCurrentMonthRange();
          setFilters((prev) => ({
            ...prev,
            "daily-performance": defaultRange,
          }));
          setAppliedFilters((prev) => ({
            ...prev,
            "daily-performance": defaultRange,
          }));
        }
        // 🔥 URL clean
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [location]);
  useEffect(() => {
    if (activeReport === "daily-performance") {
      const defaultRange = getCurrentMonthRange();
      setAppliedFilters((prev) => ({
        ...prev,
        [activeReport]: defaultRange,
      }));
    }
  }, [activeReport]);

  const [filters, setFilters] = useState<
    Record<string, Record<string, string>>
  >({
    attendance: {},
    "access-logs": {},
    "daily-performance": getCurrentMonthDates(),
    "daily-efficiency": {
      date: new Date().toISOString().split("T")[0], // ✅ single date default
    },
    department: {},
    "cabin-lockout": {},
  });
  const [appliedFilters, setAppliedFilters] = useState<
    Record<string, Record<string, string>>
  >({
    attendance: {},
    "access-logs": {},
    "daily-performance": {},
    "daily-efficiency": {},
    department: {},
    "cabin-lockout": {},
  });
  // ✅ CURRENT FILTERS
  const currentFilters = filters[activeReport] || {};
  const currentAppliedFilters = appliedFilters[activeReport] || {};
  const daysInMonth = getDaysInMonth(currentAppliedFilters?.dateFrom);
  // ✅ UPDATE FILTERS
  const updateFilters = (newFilters: Record<string, string>) => {
    setFilters((prev) => ({
      ...prev,
      [activeReport]: newFilters,
    }));
  };
  const handleApply = () => {
    let updatedFilters = { ...filters[activeReport] };
    // 🔥 ONLY for Daily Performance
    if (activeReport === "daily-performance") {
      const defaultRange = getCurrentMonthRange();
      if (!updatedFilters.dateFrom) {
        updatedFilters.dateFrom = defaultRange.dateFrom;
      }
      if (!updatedFilters.dateTo) {
        updatedFilters.dateTo = defaultRange.dateTo;
      }
    }
    setAppliedFilters((prev) => ({
      ...prev,
      [activeReport]: {
        ...updatedFilters,
        _refresh: Date.now().toString(),
      },
    }));
  };
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });
  const { data: doorData = [] } = useQuery<any[]>({
    queryKey: ["/api/doors"],
  });
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });
  // 🔥 UPDATED QUERY
  const {
    data: reportResponse = {
      data: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
    },

    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["reports", activeReport, currentAppliedFilters, page, pageSize],

    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });
      let url = "";

      if (activeReport === "attendance") {
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        url = `/api/reports/attendance?${params.toString()}`;
      } else if (activeReport === "access-logs") {
        url = `/api/reports_access_logs?${params.toString()}`;
      } else {
        url = `/api/reports/${activeReport}?${params.toString()}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });
  const totalPages = reportResponse?.totalPages || 1;

  const { data: performanceData = [] } = useQuery<any[]>({
    queryKey: ["daily-performance-table", currentAppliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });
      // 🔥 API CHANGED HERE
      const res = await fetch(
        `/api/reports/employee-productive-report?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      return json.data || [];
    },
    enabled: activeReport === "daily-efficiency",
  });

  const { data: otMatrixData = [], isLoading: isOtLoading } = useQuery<any[]>({
    queryKey: ["ot-matrix", currentAppliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });

      const res = await fetch(`/api/reports/ot-matrix?${params.toString()}`);

      if (!res.ok) throw new Error("Fetch failed");

      return res.json();
    },
    enabled: activeReport === "daily-performance", // 🔥 only for this tab
  });

  const { data: musterRollData = [], isLoading: isMusterLoading } = useQuery<
    any[]
  >({
    queryKey: ["muster-roll", currentAppliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });
      const res = await fetch(`/api/reports/muster-roll?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: activeReport === "daily-performance", // 🔥 important
  });

  const { data: departmentManpowerData = [] } = useQuery<any[]>({
    queryKey: ["department-wise-manpower", currentAppliedFilters],

    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });

      const res = await fetch(
        `/api/reports/department-wise-manpower?${params.toString()}`,
      );

      if (!res.ok) throw new Error("Fetch failed");

      const json = await res.json();

      return json.data || [];
    },

    enabled: activeReport === "department",
  });

  const { data: employeePerformanceData = [] } = useQuery<any[]>({
    queryKey: ["employee-performance", currentAppliedFilters],

    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });

      const res = await fetch(
        `/api/reports/employee-efficiency-dateRange?${params.toString()}`,
      );

      if (!res.ok) throw new Error("Fetch failed");

      const json = await res.json();

      return json.data || [];
    },

    enabled: activeReport === "monthly-efficiency",
  });

  const { data: departmentEfficiencyData = [] } = useQuery<any[]>({
    queryKey: ["department-efficiency", currentAppliedFilters],

    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });

      const res = await fetch(
        `/api/reports/department-efficiency?${params.toString()}`,
      );

      if (!res.ok) throw new Error("Fetch failed");

      const json = await res.json();

      return json.data || [];
    },

    enabled: activeReport === "monthly-efficiency",
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg text-white">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Reports Center</h1>
          {isFetching && (
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      {/* Report Type Switcher */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {reportTypes.map((rt) => (
          <button
            key={rt.id}
            onClick={() => {
              setActiveReport(rt.id);
            }}
            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
              activeReport === rt.id
                ? `${rt.bgColor} border-primary/20 shadow-sm ring-1 ring-primary/20`
                : "bg-card hover:bg-muted/50"
            }`}
          >
            <rt.icon
              className={`w-5 h-5 mb-2 ${activeReport === rt.id ? rt.color : "text-muted-foreground"}`}
            />
            <span className="text-[10px] font-bold uppercase">{rt.label}</span>
          </button>
        ))}
      </div>
      {/* Filters Section */}
      <ReportFilters
        filters={currentFilters}
        setFilters={updateFilters}
        setAppliedFilters={(f) =>
          setAppliedFilters((prev) => ({
            ...prev,
            [activeReport]: f,
          }))
        }
        onApply={handleApply}
        people={people}
        devices={doorData}
        activeReport={activeReport} // ✅ THIS FIXES ERROR
      />
      {/* RESULTS SECTION */}
      <div className="space-y-6">
        {isLoading && !reportResponse.data.length ? (
          <Card className="p-8 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Card>
        ) : (
          <div
            className={cn(
              "space-y-6 transition-opacity",
              isFetching ? "opacity-70" : "opacity-100",
            )}
          >
            {/* 1. Attendance Report */}
            {activeReport === "attendance" && (
              <Card className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Attendance Results ({reportResponse.totalCount})
                  </CardTitle>
                  {canExport && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportCSV("attendance", reportResponse.data)
                      }
                    >
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  )}
                  
                </CardHeader>
                <CardContent className="p-0">
                  <AttendanceTable data={reportResponse.data} />

                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
                    {/* Left Side */}
                    <div className="text-sm text-muted-foreground order-2 md:order-1">
                      Showing{" "}
                      <span className="font-semibold text-foreground">
                        {(page - 1) * pageSize + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-foreground">
                        {Math.min(
                          page * pageSize,
                          reportResponse?.totalCount || 0,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-foreground">
                        {reportResponse?.totalCount || 0}
                      </span>{" "}
                      attendance records
                    </div>

                    {/* Right Side */}
                    <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
                      {/* Go To Page */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Go to Page
                        </span>

                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          defaultValue={page}
                          className="w-12 h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = Number(e.currentTarget.value);

                              if (val >= 1 && val <= totalPages) {
                                setPage(val);
                              }
                            }
                          }}
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex items-center space-x-1">
                        {/* First */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>

                        {/* Prev */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-medium gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Prev
                        </Button>

                        {/* Current Page */}
                        <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
                          {page} / {totalPages}
                        </div>

                        {/* Next */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-medium gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={page === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        {/* Last */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPage(totalPages)}
                          disabled={page === totalPages}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>

                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
{activeReport === "access-logs" && (
              <Card className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Access Logs Results ({reportResponse.length})
                  </CardTitle>
                  {canExport && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportCSV("access-logs", reportResponse)}
                    >
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <AccessLogs data={reportResponse} />
                </CardContent>
              </Card>
            )}
            {/* 2. Daily Performance (Teeno Tables isi Section mein hain) */}
            {activeReport === "daily-performance" && (
              <div className="space-y-6">
                {/* A. Detail Table */}
                {/* B. Status Summary Table (P, A, O) */}
                <Card className="shadow-sm border">
                  <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Monthly Attendance Summary (1-31 Days)
                    </CardTitle>
                    {canExport && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportMonthlyStatusCSV(musterRollData, daysInMonth)
                        }
                      >
                        <Download className="w-4 h-4 mr-2" /> Export
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <DaliyPerformanceSummaryTable
                      data={musterRollData}
                      daysInMonth={daysInMonth}
                    />
                  </CardContent>
                </Card>
                {/* C. Overtime & Total Hrs Summary Table (Sabse Neeche) */}
                <Card className="shadow-sm border">
                  <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Performance Overtime & Hours Summary
                    </CardTitle>
                    {canExport && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportOTSummaryCSV(otMatrixData, daysInMonth)
                        }
                      >
                        <Download className="w-4 h-4 mr-2" /> Export
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <DaliyPerformanceOvertimeSummaryTable
                      data={otMatrixData}
                      daysInMonth={daysInMonth}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
            {/* 3. Daily Efficiency */}
            {activeReport === "daily-efficiency" && (
              <div className="space-y-6">
                {/* PERFORMANCE TABLE */}
                <Card className="shadow-sm border">
                  <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Daily Performance Details
                    </CardTitle>
                    {canExport && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportDailyPerformanceCSV(performanceData)
                        }
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <DaliyPerformanceTable data={performanceData} />
                  </CardContent>
                </Card>
                {/* EFFICIENCY TABLE */}
                <Card className="shadow-sm border">
                  <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Daily Efficiency Results
                    </CardTitle>
                    {canExport && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!reportResponse || reportResponse.length === 0} // ✅ Empty data pe disable
                        onClick={() =>
                          exportDailyEfficiencyCSV(reportResponse, doorData)
                        }
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <DailyEfficiencyTable
                      data={performanceData}
                      doors={doorData}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 5. Department Wise Manpower */}
            {activeReport === "department" && (
              <Card className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Department Wise Manpower & OT Report
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <DepartmentWiseManpowerTable
                    data={departmentManpowerData}
                    departments={departments}
                  />
                </CardContent>
              </Card>
            )}

            {/* 6. Monthly Efficiency */}
            {activeReport === "monthly-efficiency" && (
              <div className="space-y-6">
                {/* EMPLOYEE PERFORMANCE TABLE */}
                <Card className="shadow-sm border">
                  <CardHeader className="border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Employee Performance Report
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    <EmployeePerformanceTable data={employeePerformanceData} />
                  </CardContent>
                </Card>

                {/* DEPARTMENT EFFICIENCY TABLE */}
                <Card className="shadow-sm border">
                  <CardHeader className="border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Department Efficiency Report
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    <DepartmentEfficiencyTable
                      data={departmentEfficiencyData}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 4. Cabin Lockout */}
            {activeReport === "cabin-lockout" && (
              <Card className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Lockout Results ({reportResponse.length})
                  </CardTitle>
                  {canExport && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportCSV("lockout", reportResponse)}
                    >
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <LockoutReportTable data={reportResponse} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function exportCSV(id: string, data: any[]) {
  if (!data || !data.length) return;
  // 🔥 Headers
  const headers = Object.keys(data[0]);
  // 🔥 Rows
  const rows = data.map((row) =>
    headers
      .map((field) => {
        let value = row[field];
        // null/undefined
        if (value === null || value === undefined) {
          value = "";
        }
        // object handling
        else if (typeof value === "object") {
          value = JSON.stringify(value);
        }
        // escape quotes
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      })
      .join(","),
  );
  // 🔥 Final CSV
  const csvContent = [headers.join(","), ...rows].join("\n");
  // 🔥 Download
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${id}-report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
