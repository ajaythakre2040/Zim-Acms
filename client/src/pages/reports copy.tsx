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
    id: "daily performance",
    label: "Daily Performance",
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
  "daily performance": ["dateFrom", "dateTo", "employeeCode", "deviceId", "status"],
  "daily-efficiency": ["dateFrom", "dateTo", "employeeCode", "deviceId", "status"],
  "cabin-lockout": ["dateFrom", "dateTo", "employeeCode", "deviceId"],
};

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
                    setFilters({ ...filters, employeeCode: v === "all" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {people.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={String(p.employeeCode)}
                      >
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
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium">Employee Name</th>
            <th className="text-left p-3 font-medium">Employee Code</th>
            <th className="text-left p-3 font-medium">Designation</th>
            <th className="text-left p-3 font-medium">Department</th>
            <th className="text-left p-3 font-medium">Shift</th>
            <th className="text-left p-3 font-medium">Door Name</th>
            <th className="text-left p-3 font-medium">Device Name</th>
            <th className="text-left p-3 font-medium">Direction</th>
            <th className="text-left p-3 font-medium">Log Date</th>
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
            <th className="text-left p-3 font-medium">Device Location</th>
            <th className="text-left p-3 font-medium">Per Day Rate</th>
            <th className="text-left p-3 font-medium">Shift</th>
            <th className="text-left p-3 font-medium">In Time</th>
            <th className="text-left p-3 font-medium">In Punch</th>
            <th className="text-left p-3 font-medium">Out Punch</th>
            <th className="text-left p-3 font-medium">Hours Worked</th>
            <th className="text-left p-3 font-medium">Duty Status</th>
            <th className="text-left p-3 font-medium">OT Hrs</th>
          </tr>
        </thead>

        <tbody>
          {safeData.length > 0 ? (
            safeData.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="p-3">{r.employeeName}</td>
                <td className="p-3">{r.gender || "-"}</td>
                <td className="p-3">{r.deviceLocation || "-"}</td>
                <td className="p-3">{r.perDayRate || "-"}</td>
                <td className="p-3">{r.shift || "-"}</td>
                <td className="p-3">{formatTime(r.inTime)}</td>
                <td className="p-3">{formatTime(r.inPunch)}</td>
                <td className="p-3">{formatTime(r.outPunch)}</td>
                <td className="p-3">{formatHours(r.workingHours)}</td>
                <td className="p-3">{statusBadge(r.status)}</td>
                <td className="p-3">{r.otHours || 0}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={11}
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

function DaliyPerformanceSummaryTable({ data }: { data: any[] }) {
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

    const date = new Date(r.date).getDate(); // 1-31

    grouped[key].days[date] = r.status;

    if (r.status === "present") grouped[key].present++;
    else if (r.status === "absent") grouped[key].absent++;
    else grouped[key].off++;
  });

  const employees = Object.values(grouped);

  return (
    <div className="overflow-x-auto border rounded-md mt-6">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="p-2">Employee</th>
            <th className="p-2">Rate</th>

            {/* 🔥 1–31 columns */}
            {Array.from({ length: 31 }, (_, i) => (
              <th key={i} className="p-2 text-center">
                {i + 1}
              </th>
            ))}

            <th className="p-2">Present</th>
            <th className="p-2">Pay</th>
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
                  <td className="p-2">{emp.perDayRate}</td>

                  {/* 🔥 Day cells */}
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const status = emp.days[day];

                    return (
                      <td key={i} className="text-center p-2">
                        {status === "present" && "P"}
                        {status === "absent" && "A"}
                        {status === "off" && "O"}
                        {!status && "-"}
                      </td>
                    );
                  })}

                  <td className="p-2 text-center">{emp.present}</td>
                  <td className="p-2 text-center font-bold text-emerald-600">
                    ₹{totalPay}
                  </td>
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

function DaliyPerformanceOvertimeSummaryTable({ data }: { data: any[] }) {
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
        totalWorkingHrs: 0, // Naya field hours track karne ke liye
      };
    }

    const date = new Date(r.date).getDate(); // 1-31
    grouped[key].days[date] = r.status;

    // Total hours calculate ho rahe hain (workingHours ko number mein convert karke)
    if (r.workingHours) {
      grouped[key].totalWorkingHrs += Number(r.workingHours) || 0;
    }
  });

  const employees = Object.values(grouped);

  return (
    <div className="overflow-x-auto border rounded-md mt-6">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="p-2 text-left">Employee Name</th>
            <th className="p-2 text-center">Per Day Rate</th>

            {/* 🔥 1–31 columns */}
            {Array.from({ length: 31 }, (_, i) => (
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
                  <td className="p-2 text-center">₹{emp.perDayRate}</td>

                  {/* 🔥 Day cells */}
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const status = emp.days[day];

                    return (
                      <td
                        key={i}
                        className="text-center p-1 border-x text-[10px]"
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
                        {!status && (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* 🔥 Total Hours Column */}
                  <td className="p-2 text-center font-bold bg-primary/5 text-primary">
                    {emp.totalWorkingHrs.toFixed(2)}h
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

// 4. Main Page Component
export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("attendance");
  const [location] = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");

    if (tab) {
      const validTabs = ["attendance", "access-logs", "daily performance", "daily-efficiency", "cabin-lockout"];

      if (validTabs.includes(tab)) {
        setActiveReport(tab);

        // 🔥 CRITICAL: URL se "?tab=..." ko remove karein 
        // Taaki refresh karne par ya wapas aane par ye wapas switch na ho
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [location]);
  // 🔥 PER REPORT FILTERS
  const [filters, setFilters] = useState<
    Record<string, Record<string, string>>
  >({
    attendance: {},
    "access-logs": {},
    "daily performance": {},
    "daily efficiency": {},
    "cabin-lockout": {},
  });

  const [appliedFilters, setAppliedFilters] = useState<
    Record<string, Record<string, string>>
  >({
    attendance: {},
    "access-logs": {},
    "daily performance": {},
    "daily efficiency": {},
    "cabin-lockout": {},
  });

  // ✅ CURRENT FILTERS
  const currentFilters = filters[activeReport] || {};
  const currentAppliedFilters = appliedFilters[activeReport] || {};

  // ✅ UPDATE FILTERS
  const updateFilters = (newFilters: Record<string, string>) => {
    setFilters((prev) => ({
      ...prev,
      [activeReport]: newFilters,
    }));
  };

  const handleApply = () => {
    setAppliedFilters((prev) => ({
      ...prev,
      [activeReport]: {
        ...filters[activeReport],
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

      const res = await fetch(
        `/api/reports/${activeReport}?${params.toString()}`,
      );

      if (!res.ok) throw new Error("Fetch failed");

      return res.json();
    },
    placeholderData: (prev) => prev,
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
            {activeReport === "daily performance" && (
              <div className="space-y-6">
                {/* A. Detail Table */}
                <Card className="shadow-sm border">
                  <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Daily Performance Details
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportCSV("performance-detail", reportData)
                      }
                    >
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DaliyPerformanceTable data={reportData} />
                  </CardContent>
                </Card>

                {/* B. Status Summary Table (P, A, O) */}
                <Card className="shadow-sm border">
                  <CardHeader className="border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Monthly Status Summary (1-31 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DaliyPerformanceSummaryTable data={reportData} />
                  </CardContent>
                </Card>

                {/* C. Overtime & Total Hrs Summary Table (Sabse Neeche) */}
                <Card className="shadow-sm border">
                  <CardHeader className="border-b py-3 px-4">
                    <CardTitle className="text-sm font-semibold">
                      Performance Overtime & Hours Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DaliyPerformanceOvertimeSummaryTable data={reportData} />
                  </CardContent>
                </Card>
              </div>
            )}
            {/* 3. Daily Efficiency */}
            {activeReport === "daily-efficiency" && (
              <Card className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Daily Efficiency Results ({reportData.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportCSV("daily-efficiency", reportData)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  <DailyEfficiencyTable data={reportData} doors={doorData} />
                </CardContent>
              </Card>
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
  if (!data.length) return;
  const header = Object.keys(data[0]).join(",");
  const rows = data
    .map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${id}-report.csv`;
  a.click();
}
