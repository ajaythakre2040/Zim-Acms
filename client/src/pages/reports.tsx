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
} from "lucide-react";
import { type Person } from "@shared/schema";

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
  "daily-efficiency": [
    "dateFrom",
    "dateTo",
    "employeeCode",
    "deviceId",
    "status",
  ],
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

function exportDailyEfficiencyCSV(data: any[], doors: any[]) {
  if (!data.length) return;

  // 🔥 HEADERS SAME AS TABLE
  const headers = [
    "Employee Code",
    "Employee Name",

    ...doors.flatMap((d) => [
      `${d.DeviceName || d.name} IN`,
      `${d.DeviceName || d.name} OUT`,
    ]),

    "Total Time",
    "Productive Time",
    "Efficiency %",
  ];

  // 🔥 ROWS SAME AS TABLE
  const rows = data.map((r) => {
    const doorValues = doors.flatMap((d) => {
      const key = d.DeviceName || d.name;

      return [r?.doors?.[key]?.in || 0, r?.doors?.[key]?.out || 0];
    });

    return [
      r.employeeCode || "-",
      r.employeeName || "-",

      ...doorValues,

      r.totalTime || "-",
      r.productiveTime || "-",
      r.efficiency ? `${r.efficiency}%` : "-",
    ];
  });

  // 🔥 CSV GENERATE
  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "daily-efficiency-report.csv";
  a.click();
}

function exportDailyPerformanceCSV(data: any[]) {
  if (!data.length) return;

  const headers = [
    "Employee Name",
    "Gender",
    "Latest Punch Door",
    "Shift",
    "Shift Time",
    "In Punch",
    "Out Punch",
    "Hours Worked",
    "Duty Status",
    "OT Hrs",
  ];

  const rows = data.map((r) => [
    r.employeeName || "-",
    r.gender || "-",
    r.doorName || "-",
    r.shiftname || "-",
    r.shifttime || "-",
    formatTime(r.firstIn),
    formatTime(r.lastOut),

    r.productiveMinutes
      ? `${Math.floor(r.productiveMinutes / 60)}h ${r.productiveMinutes % 60}m`
      : "0h 0m",

    r.attendanceStatus || "-",

    r.overtimeMinutes ? `${Math.floor(r.overtimeMinutes / 60)}h` : "0",
  ]);

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "daily-performance-details.csv";

  a.click();
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

// 2. Filter Component
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
            {allowed.includes("dateFrom") && (
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

            {/* TO DATE */}
            {allowed.includes("dateTo") && (
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

// 3. Tables
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
                  ? new Date(r.logdate || r.LogDate).toLocaleString()
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
              <tr key={r.id} className="border-b">
                <td className="p-3">{r.employeeName || "-"}</td>
                <td className="p-3">{r.gender || "-"}</td>
                <td className="p-3">{r.doorName || "-"}</td>
                <td className="p-3">{r.shiftname || "-"}</td>

                <td className="p-3">{r.shifttime || "-"}</td>

                <td className="p-3 font-mono text-blue-600 dark:text-blue-400">
                  {formatTime(r.firstIn)}
                </td>

                <td className="p-3 font-mono text-orange-600 dark:text-orange-400">
                  {formatTime(r.lastOut)}
                </td>

                <td className="p-3">
                  {r.productiveMinutes
                    ? `${Math.floor(r.productiveMinutes / 60)}h ${r.productiveMinutes % 60}m`
                    : "0h 0m"}
                </td>

                <td className="p-3">{r.attendanceStatus}</td>

                <td className="p-3">
                  {r.overtimeMinutes
                    ? `${Math.floor(r.overtimeMinutes / 60)}h`
                    : "0"}
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
              const totalDays = emp.present + emp.absent + emp.off;
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
                        {!status && <span className="text-gray-400">-</span>}
                      </td>
                    );
                  })}

                  <td className="p-2 text-center">{emp.present}</td>
                  {/* <td className="p-2 text-center font-bold text-emerald-600">
                    ₹{totalPay}
                  </td> */}
                  <td className="p-2 text-center">{emp.off}</td>
                  <td className="p-2 text-center">{emp.absent}</td>
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

    const date = new Date(r.workDate).getDate();

    const otMinutes = Number(r.overtimeMinutes || 0);
    const otHours = otMinutes / 60;

    // 🔥 IMPORTANT: yaha store kar
    grouped[key].days[date] = otHours;

    // total
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
                        <span className="text-black font-medium">
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

function DailyEfficiencyTable({ data, doors }: { data?: any[]; doors: any[] }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-xs">
        {/* 🔥 HEADER */}
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium">Employee Code</th>
            <th className="text-left p-3 font-medium">Employee Name</th>

            {/* 🔥 DYNAMIC DOORS */}
            {doors.map((d, i) => (
              <>
                <th key={`in-${i}`} className="text-center p-3 font-medium">
                  {d.DeviceName || d.name} IN
                </th>
                <th key={`out-${i}`} className="text-center p-3 font-medium">
                  {d.DeviceName || d.name} OUT
                </th>
              </>
            ))}

            <th className="text-center p-3 font-medium">Total Time</th>
            <th className="text-center p-3 font-medium">Productive Time</th>
            <th className="text-center p-3 font-medium">Efficiency %</th>
          </tr>
        </thead>

        {/* 🔥 BODY */}
        <tbody>
          {safeData.length > 0 ? (
            safeData.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/20">
                <td className="p-3">{r.employeeCode}</td>
                <td className="p-3">{r.employeeName}</td>

                {/* 🔥 DOOR DATA */}
                {doors.map((d, j) => {
                  const key = d.DeviceName || d.name;

                  return (
                    <>
                      <td key={`in-${j}`} className="text-center p-3">
                        {r?.doors?.[key]?.in || 0}
                      </td>
                      <td key={`out-${j}`} className="text-center p-3">
                        {r?.doors?.[key]?.out || 0}
                      </td>
                    </>
                  );
                })}

                <td className="text-center p-3">{r.totalTime || "-"}</td>

                <td className="text-center p-3">{r.productiveTime || "-"}</td>

                <td className="text-center p-3 font-semibold">
                  {r.efficiency ? `${r.efficiency}%` : "-"}
                </td>
              </tr>
            ))
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
  const [activeReport, setActiveReport] = useState("attendance");
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
    "daily-efficiency": {},
    "cabin-lockout": {},
  });

  const [appliedFilters, setAppliedFilters] = useState<
    Record<string, Record<string, string>>
  >({
    attendance: {},
    "access-logs": {},
    "daily-performance": {},
    "daily-efficiency": {},
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

  // 🔥 UPDATED QUERY
  const {
    data: reportData = [],
    isLoading,
    isFetching,
  } = useQuery<any[]>({
    queryKey: ["reports", activeReport, currentAppliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });

      const url =
        activeReport === "access-logs"
          ? `/api/reports_access_logs?${params.toString()}`
          : `/api/reports/${activeReport}?${params.toString()}`;

      const res = await fetch(url);

      if (!res.ok) throw new Error("Fetch failed");

      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const { data: performanceData = [] } = useQuery<any[]>({
    queryKey: ["daily-performance-table", currentAppliedFilters],

    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(currentAppliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") {
          params.set(k, String(v));
        }
      });

      const res = await fetch(
        `/api/reports/daily-performance?${params.toString()}`,
      );

      if (!res.ok) throw new Error("Fetch failed");

      return res.json();
    },

    enabled: activeReport === "daily-efficiency",
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
  // const handleApply = () => setAppliedFilters({ ...filters, _refresh: Date.now().toString() });

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
            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${activeReport === rt.id
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
        {isLoading && !reportData.length ? (
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
                    Attendance Results ({reportData.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportCSV("attendance", reportData)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <AttendanceTable data={reportData} />
                </CardContent>
              </Card>
            )}
            {activeReport === "access-logs" && (
              <Card className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Access Logs Results ({reportData.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportCSV("access-logs", reportData)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <AccessLogs data={reportData} />
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

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportMonthlyStatusCSV(musterRollData, daysInMonth)
                      }
                    >
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
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

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportOTSummaryCSV(otMatrixData, daysInMonth)
                      }
                    >
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
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

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportDailyPerformanceCSV(performanceData)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
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

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportDailyEfficiencyCSV(reportData, doorData)
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>

                  <CardContent className="p-0">
                    <DailyEfficiencyTable data={reportData} doors={doorData} />
                  </CardContent>
                </Card>
              </div>
            )}
            {/* 4. Cabin Lockout */}
            {activeReport === "cabin-lockout" && (
              <Card className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Lockout Results ({reportData.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportCSV("lockout", reportData)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <LockoutReportTable data={reportData} />
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
