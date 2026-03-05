import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Clock, AlertTriangle, UserX, Timer, DoorOpen,
  UserCheck, Users, Search, Download, Filter, BarChart3,
  CalendarDays, ArrowUpDown, ChevronDown, RefreshCw
} from "lucide-react";
import { type Department, type Site, type Person, devices } from "@shared/schema";

const reportTypes = [
  { id: "attendance", label: "Attendance", icon: Clock, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/40", description: "Daily attendance records with clock in/out times" },
  { id: "late-coming", label: "Late Coming", icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/40", description: "Employees arriving after shift start time" },
  { id: "early-going", label: "Early Going", icon: Timer, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/40", description: "Employees leaving before shift end time" },
  { id: "absentee", label: "Absentee", icon: UserX, color: "text-rose-500", bgColor: "bg-rose-50 dark:bg-rose-950/40", description: "Absent employees for selected date range" },
  { id: "overtime", label: "Overtime", icon: BarChart3, color: "text-violet-500", bgColor: "bg-violet-50 dark:bg-violet-950/40", description: "Overtime hours worked by employees" },
  { id: "access-log", label: "Access Log", icon: DoorOpen, color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950/40", description: "Door access events with entry/exit details" },
  { id: "visitor", label: "Visitor", icon: UserCheck, color: "text-teal-500", bgColor: "bg-teal-50 dark:bg-teal-950/40", description: "Visitor check-in/check-out records" },
  { id: "employee-summary", label: "Employee Summary", icon: Users, color: "text-indigo-500", bgColor: "bg-indigo-50 dark:bg-indigo-950/40", description: "Employee directory with department & status" },
];

function formatDateTime(dt: string | null | undefined) {
  if (!dt) return "-";
  const d = new Date(dt);
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}
// function formatTime(dt: string | null | undefined) {
//   if (!dt) return "-";
//   const d = new Date(dt);
//   return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
// }

function formatTime(dt: string | null | undefined) {
  if (!dt || dt === "N/A") return "-";

  const d = new Date(dt);

  // Agar Date object invalid ban raha hai toh "-" return karein
  if (isNaN(d.getTime())) return "-";

  // 'en-US' aur hour12: true use karne se proper AM/PM aayega
  // 'en-IN' default mein kabhi-kabhi 24-hour format de deta hai browser settings ke hisab se
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: 'UTC' // Yeh sabse important hai: Yeh browser ko conversion karne se rokega
  });
}
// function formatHours(h: number | null | undefined) {
//   if (h === null || h === undefined) return "-";
//   return `${h.toFixed(1)}h`;
// }
function formatHours(h: string | number | undefined) {
  if (h === null || h === undefined || h === "0.00") return "-";
  return `${Number(h).toFixed(1)}h`;
}
function statusBadge(status: string) {
  const styles: Record<string, string> = {
    present: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    late: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    absent: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    half_day: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
    on_leave: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    checked_in: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    checked_out: "bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400",
    scheduled: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    no_show: "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400",
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    inactive: "bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400",
    suspended: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    entry: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    exit: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    denied: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  };
  return (
    <Badge className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}

function ReportFilters({
  reportId,
  filters,
  setFilters,
  setAppliedFilters, // <--- Ise yahan add karein
  onApply,
  departments,
  sites,
  people,
  devices,
}: {
  reportId: string;
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  setAppliedFilters: (f: Record<string, string>) => void; // <--- Type bhi add karein
  onApply: () => void;
  departments: Department[];
  sites: Site[];
  people: Person[];
  devices: any[];
}) {
  const showDateRange = reportId !== "employee-summary";
  const showDepartment = [''].includes(reportId);

  // const showDepartment = ["attendance", "late-coming", "early-going", "absentee", "overtime", "employee-summary"].includes(reportId);
  const showPerson = ["attendance", "late-coming", "early-going", "absentee", "overtime", "access-log"].includes(reportId);
  const showSite = [''].includes(reportId);

  // const showSite = ["attendance", "late-coming", "early-going", "absentee", "overtime", "access-log"].includes(reportId);
  const showStatus = reportId === "attendance" || reportId === "visitor" || reportId === "employee-summary";
  const showEventType = reportId === "access-log";
  const showPersonType = reportId === "employee-summary";
  const showDevice = reportId === "attendance";
  const statusOptions: Record<string, { value: string; label: string }[]> = {
    attendance: [
      { value: "present", label: "Present" },
      { value: "late", label: "Late" },
      { value: "absent", label: "Absent" },
      { value: "half_day", label: "Half Day" },
      { value: "on_leave", label: "On Leave" },
    ],
    visitor: [
      { value: "scheduled", label: "Scheduled" },
      { value: "checked_in", label: "Checked In" },
      { value: "checked_out", label: "Checked Out" },
      { value: "cancelled", label: "Cancelled" },
      { value: "no_show", label: "No Show" },
    ],
    "employee-summary": [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "suspended", label: "Suspended" },
    ],
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Filter className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {showDateRange && (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">From Date</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  data-testid="input-filter-dateFrom"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">To Date</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  data-testid="input-filter-dateTo"
                />
              </div>
            </>
          )}
          {showDepartment && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Department</Label>
              <Select value={filters.departmentId || "all"} onValueChange={(v) => setFilters({ ...filters, departmentId: v === "all" ? "" : v })}>
                <SelectTrigger data-testid="select-filter-department">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showPerson && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Employee
              </Label>
              <Select
                value={filters.personId || "all"}
                onValueChange={(v) => setFilters({ ...filters, personId: v === "all" ? "" : v })}
              >
                <SelectTrigger data-testid="select-filter-person">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {people.map((p) => {
                    // Hum preference 'employeeCode' ko denge kyunki filtering/logs isi se hote hain
                    const codeValue = String(p.employeeCode || p.id).trim();

                    return (
                      <SelectItem key={p.id} value={codeValue}>
                        {/* FIXED: firstName + lastName ki jagah employeeName use kiya */}
                        {p.employeeName} {p.employeeCode ? `(${p.employeeCode})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          {showSite && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Site</Label>
              <Select value={filters.locationId || "all"} onValueChange={(v) => setFilters({ ...filters, locationId: v === "all" ? "" : v })}>
                <SelectTrigger data-testid="select-filter-site">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showStatus && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {(statusOptions[reportId] || []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showEventType && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Event Type</Label>
              <Select value={filters.eventType || "all"} onValueChange={(v) => setFilters({ ...filters, eventType: v === "all" ? "" : v })}>
                <SelectTrigger data-testid="select-filter-eventType">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="tailgate">Tailgate</SelectItem>
                  <SelectItem value="forced">Forced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {showPersonType && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Person Type</Label>
              <Select value={filters.personType || "all"} onValueChange={(v) => setFilters({ ...filters, personType: v === "all" ? "" : v })}>
                <SelectTrigger data-testid="select-filter-personType">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {/* 2. Device Select Dropdown */}
          {showDevice && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Device</Label>
              <Select
                // Ensure karein ki value hamesha string ho aur agar empty hai toh "all" ho
                value={filters.deviceId ? String(filters.deviceId) : "all"}
                onValueChange={(v) => {
                  setFilters({
                    ...filters,
                    deviceId: v === "all" ? "" : v
                  });
                }}
              >
                <SelectTrigger data-testid="select-filter-device">
                  {/* SelectValue placeholder tabhi dikhayega jab value match nahi hogi */}
                  <SelectValue placeholder="All Devices" />
                </SelectTrigger>

                <SelectContent>
                  {/* "all" ki value unique honi chahiye */}
                  <SelectItem value="all">All Devices</SelectItem>

                  {devices && devices.map((d) => {
                    // Device ID ko string mein convert karein comparison ke liye
                    const dId = String(d.DeviceId || d.id);
                    return (
                      <SelectItem
                        key={dId}
                        value={dId}
                      >
                        {d.DeviceName || d.name || "Unknown Device"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Button onClick={onApply} size="sm" data-testid="button-apply-filter">
              <Search className="w-3.5 h-3.5 mr-1" />
              Apply
            </Button>
            <Button variant="secondary" size="sm" onClick={() => {
              setFilters({});
              // setTimeout(onApply, 0);
              setAppliedFilters({});
            }} data-testid="button-clear-filter">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" data-testid="table-report">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-2 font-medium">Employee</th>
            <th className="text-left p-2 font-medium">Emp Code</th>
            <th className="text-left p-2 font-medium">Date</th>
            <th className="text-left p-2 font-medium">Clock In</th>
            <th className="text-left p-2 font-medium">Clock Out</th>
            <th className="text-left p-2 font-medium">Working Hrs</th>
            <th className="text-left p-2 font-medium">OT Hrs</th>
            <th className="text-left p-2 font-medium">Late (min)</th>
            <th className="text-left p-2 font-medium">Early (min)</th>
            <th className="text-left p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.id} className="border-b border-border/50 hover-elevate" data-testid={`row-report-${r.id}`}>
              <td className="p-2 font-medium">{r.firstName} {r.lastName || ""}</td>
              <td className="p-2 text-muted-foreground">{r.employeeId || r.employeeCode || "-"}</td>
              <td className="p-2">{r.date}</td>
              <td className="p-2">{formatTime(r.clockIn || r.firstIn)}</td>
              <td className="p-2">{formatTime(r.clockOut || r.lastOut)}</td>
              <td className="p-2">{formatHours(r.workingHours || r.totalHours)}</td>
              <td className="p-2">{formatHours(r.overtimeHours)}</td>
              <td className="p-2">{r.lateByMins > 0 ? <span className="text-amber-600 dark:text-amber-400 font-medium">{r.lateByMins}</span> : "-"}</td>
              <td className="p-2">{r.earlyByMins > 0 ? <span className="text-orange-600 dark:text-orange-400 font-medium">{r.earlyByMins}</span> : "-"}</td>
              <td className="p-2">{statusBadge(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessLogTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" data-testid="table-report">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-2 font-medium">Employee</th>
            <th className="text-left p-2 font-medium">ID</th>
            <th className="text-left p-2 font-medium">Event</th>
            <th className="text-left p-2 font-medium">Method</th>
            <th className="text-left p-2 font-medium">Authorized</th>
            <th className="text-left p-2 font-medium">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.id} className="border-b border-border/50 hover-elevate" data-testid={`row-report-${r.id}`}>
              <td className="p-2 font-medium">{r.firstName || "Unknown"} {r.lastName || ""}</td>
              <td className="p-2 text-muted-foreground">{r.employeeId || "-"}</td>
              <td className="p-2">{statusBadge(r.eventType)}</td>
              <td className="p-2 capitalize">{r.accessMethod || "-"}</td>
              <td className="p-2">
                {r.isAuthorized ? (
                  <Badge className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 no-default-hover-elevate no-default-active-elevate">Yes</Badge>
                ) : (
                  <Badge className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 no-default-hover-elevate no-default-active-elevate">No</Badge>
                )}
              </td>
              <td className="p-2">{formatDateTime(r.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisitorTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" data-testid="table-report">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-2 font-medium">Visitor</th>
            <th className="text-left p-2 font-medium">Company</th>
            <th className="text-left p-2 font-medium">Phone</th>
            <th className="text-left p-2 font-medium">Purpose</th>
            <th className="text-left p-2 font-medium">Check In</th>
            <th className="text-left p-2 font-medium">Check Out</th>
            <th className="text-left p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.id} className="border-b border-border/50 hover-elevate" data-testid={`row-report-${r.id}`}>
              <td className="p-2 font-medium">{r.firstName} {r.lastName || ""}</td>
              <td className="p-2 text-muted-foreground">{r.company || "-"}</td>
              <td className="p-2">{r.phone || "-"}</td>
              <td className="p-2">{r.purpose || "-"}</td>
              <td className="p-2">{formatDateTime(r.checkInAt)}</td>
              <td className="p-2">{formatDateTime(r.checkOutAt)}</td>
              <td className="p-2">{statusBadge(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" data-testid="table-report">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-2 font-medium">Name</th>
            <th className="text-left p-2 font-medium">Emp Code</th>
            <th className="text-left p-2 font-medium">Email</th>
            <th className="text-left p-2 font-medium">Phone</th>
            <th className="text-left p-2 font-medium">Type</th>
            <th className="text-left p-2 font-medium">Joining Date</th>
            <th className="text-left p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.id} className="border-b border-border/50 hover-elevate" data-testid={`row-report-${r.id}`}>
              <td className="p-2 font-medium">{r.firstName} {r.lastName || ""}</td>
              <td className="p-2 text-muted-foreground">{r.employeeId || r.employeeCode || "-"}</td>
              <td className="p-2">{r.email || "-"}</td>
              <td className="p-2">{r.phone || "-"}</td>
              <td className="p-2 capitalize">{r.personType || "-"}</td>
              <td className="p-2">{r.dateOfJoining || "-"}</td>
              <td className="p-2">{statusBadge(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportDataView({ reportId, data, isLoading }: { reportId: string; data: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
            <FileText className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No records found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Adjust filters or select a different date range</p>
        </CardContent>
      </Card>
    );
  }

  const renderTable = () => {
    switch (reportId) {
      case "attendance":
      case "late-coming":
      case "early-going":
      case "absentee":
      case "overtime":
        return <AttendanceTable data={data} />;
      case "access-log":
        return <AccessLogTable data={data} />;
      case "visitor":
        return <VisitorTable data={data} />;
      case "employee-summary":
        return <EmployeeTable data={data} />;
      default:
        return <AttendanceTable data={data} />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
          </div>
          Results
          <Badge variant="secondary" className="text-[10px]">{data.length} records</Badge>
        </CardTitle>
        <Button variant="secondary" size="sm" onClick={() => exportCSV(reportId, data)} data-testid="button-export-csv">
          <Download className="w-3.5 h-3.5 mr-1" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {renderTable()}
      </CardContent>
    </Card>
  );
}

function exportCSV(reportId: string, data: any[]) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map((r) =>
    keys.map((k) => {
      const val = r[k];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportId}-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("attendance");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: devicesData = [] } = useQuery<any[]>({ queryKey: ["/api/devices"] });
  const queryParams = new URLSearchParams();
  Object.entries(appliedFilters).forEach(([k, v]) => { if (v) queryParams.set(k, v); });
  const qs = queryParams.toString();

  // const { data: reportData = [], isLoading } = useQuery<any[]>({
  //   queryKey: [`/api/reports/${activeReport}`, qs],
  //   queryFn: async () => {
  //     const res = await fetch(`/api/reports/${activeReport}${qs ? `?${qs}` : ""}`, { credentials: "include" });
  //     if (!res.ok) throw new Error("Failed to fetch report");
  //     return res.json();
  //   },
  // });
// Replace your existing useQuery for reportData with this:
  // 1. Generic mein <any[], Error> specify karein
  // 2. queryFn ke return type ko Promise<any[]> banayein
  const { data: reportData = [], isLoading, refetch } = useQuery<any[], Error>({
    queryKey: ["reports", activeReport, appliedFilters],
    queryFn: async (): Promise<any[]> => { // <-- Return type yahan define karein
      const params = new URLSearchParams();

      // Type casting: String(v) zaroori hai URLSearchParams ke liye
      Object.entries(appliedFilters).forEach(([k, v]) => {
        if (v && k !== "_refresh") params.set(k, String(v));
      });

      const finalQs = params.toString();
      const url = `/api/reports/${activeReport}${finalQs ? `?${finalQs}` : ""}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch report");

      const result = await res.json();

      // Final Safety Check: Ensure karein ki result hamesha array ho
      return Array.isArray(result) ? result : [];
    },
    // FIXED TYPO: 'stateTime' nahi, 'staleTime' hota hai
    staleTime: 0,
  });
  // const handleApply = () => setAppliedFilters({ ...filters });
const handleApply = () => {
  setAppliedFilters({ 
    ...filters, 
    _refresh: Date.now().toString() // Yeh har click par state change trigger karega
  });
};
  const handleReportChange = (id: string) => {
    setActiveReport(id);
    setFilters({});
    setAppliedFilters({});
  };

  const currentReport = reportTypes.find((r) => r.id === activeReport)!;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md glow-primary">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Reports</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Generate and export attendance, access, and employee reports</p>
          </div>
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto" data-testid="badge-report-name">
          <currentReport.icon className={`w-3 h-3 mr-1 ${currentReport.color}`} />
          {currentReport.label} Report
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {reportTypes.map((rt) => {
          const isActive = activeReport === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => handleReportChange(rt.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center ${isActive
                ? `${rt.bgColor} border-current/20 ring-1 ring-current/10`
                : "bg-card border-border/50 hover-elevate"
                }`}
              data-testid={`button-report-${rt.id}`}
            >
              <div className={`w-8 h-8 rounded-lg ${isActive ? `bg-gradient-to-br ${getGradientForReport(rt.id)}` : "bg-muted/60"} flex items-center justify-center`}>
                <rt.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-[10px] font-medium leading-tight ${isActive ? rt.color : "text-muted-foreground"}`}>{rt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 dark:bg-muted/15 border border-border/30">
        <currentReport.icon className={`w-4 h-4 ${currentReport.color} mt-0.5 flex-shrink-0`} />
        <p className="text-xs text-muted-foreground">{currentReport.description}</p>
      </div>

      <ReportFilters
        reportId={activeReport}
        filters={filters}
        setFilters={setFilters}
        setAppliedFilters={setAppliedFilters}
        onApply={handleApply}
        departments={departments}
        sites={sites}
        people={people}
        devices={devicesData}
      />

      <ReportDataView reportId={activeReport} data={reportData} isLoading={isLoading} />
    </div>
  );
}

function getGradientForReport(id: string): string {
  const gradients: Record<string, string> = {
    attendance: "from-blue-500 to-indigo-500",
    "late-coming": "from-amber-500 to-orange-500",
    "early-going": "from-orange-500 to-red-500",
    absentee: "from-rose-500 to-pink-500",
    overtime: "from-violet-500 to-purple-500",
    "access-log": "from-emerald-500 to-teal-500",
    visitor: "from-teal-500 to-cyan-500",
    "employee-summary": "from-indigo-500 to-blue-500",
  };
  return gradients[id] || "from-blue-500 to-indigo-500";
}
