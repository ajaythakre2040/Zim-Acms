import { useState } from "react";
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
    id: "door-count",
    label: "Door Count",
    icon: DoorOpen,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    description: "Door-wise total employee entry and exit counts",
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

// // --- Formatting Helpers ---
// function formatDateTime(dt: string | null | undefined) {
//   if (!dt) return "-";
//   const d = new Date(dt);
//   return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
// }

// function formatTime(dt: string | null | undefined) {
//   if (!dt || dt === "N/A") return "-";
//   const d = new Date(dt);
//   if (isNaN(d.getTime())) return "-";
//   return d.toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
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
  };
  return (
    <Badge className={`text-[10px] shadow-none border-none ${styles[status?.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}

// 2. Filter Component
function ReportFilters({
  filters,
  setFilters,
  setAppliedFilters,
  onApply,
  people,
  devices,
}: {
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  setAppliedFilters: (f: Record<string, string>) => void;
  onApply: () => void;
  people: Person[];
  devices: any[];
}) {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">Report Filters</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">FROM DATE</Label>
              <Input type="date" value={filters.dateFrom || ""} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">TO DATE</Label>
              <Input type="date" value={filters.dateTo || ""} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">EMPLOYEE</Label>
              <Select value={filters.personId || "all"} onValueChange={(v) => setFilters({ ...filters, personId: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All Employees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={String(p.employeeCode || p.id)}>
                      {p.employeeName} {p.employeeCode ? `(${p.employeeCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">DOOR / DEVICE</Label>
              <Select value={filters.deviceId || "all"} onValueChange={(v) => setFilters({ ...filters, deviceId: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All Doors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doors</SelectItem>
                  {devices?.map((d) => (
                    <SelectItem key={d.id || d.DeviceId} value={String(d.DeviceId || d.id)}>
                      {d.DeviceName || d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">STATUS</Label>
              <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Lockout</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button onClick={onApply} size="sm" className="px-5 shadow-sm"><Search className="w-4 h-4 mr-2" />Apply</Button>
            <Button variant="secondary" size="sm" onClick={() => { setFilters({}); setAppliedFilters({}); }} className="px-5"><RefreshCw className="w-4 h-4 mr-2" />Clear</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 3. Tables
function AttendanceTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium">Employee</th>
            <th className="text-left p-3 font-medium">Code</th>
            <th className="text-left p-3 font-medium">Date</th>
            <th className="text-left p-3 font-medium">In</th>
            <th className="text-left p-3 font-medium">Out</th>
            <th className="text-left p-3 font-medium">Hrs</th>
            <th className="text-left p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
              <td className="p-3 font-medium">{r.firstName || r.employeeName}</td>
              <td className="p-3 text-muted-foreground">{r.employeeCode || "-"}</td>
              <td className="p-3">{r.date}</td>
              <td className="p-3 font-medium text-emerald-600">{formatTime(r.clockIn)}</td>
              <td className="p-3 font-medium text-blue-600">{formatTime(r.clockOut)}</td>
              <td className="p-3">{formatHours(r.workingHours)}</td>
              <td className="p-3">{statusBadge(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DoorCountTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider">Door Name</th>
            <th className="text-center p-4 font-semibold text-muted-foreground uppercase tracking-wider">Employees IN</th>
            <th className="text-center p-4 font-semibold text-muted-foreground uppercase tracking-wider">Employees OUT</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
              <td className="p-4 font-bold text-sm">{row.deviceName || "Unknown"}</td>
              <td className="p-4 text-center">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{row.inCount ?? 0}</Badge>
              </td>
              <td className="p-4 text-center">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">{row.outCount ?? 0}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Replacement for CefaloReportTable
function LockoutReportTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider">Cabin / Door</th>
            <th className="text-center p-4 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-center p-4 font-semibold text-muted-foreground uppercase tracking-wider">Expiry Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
              <td className="p-4">
                <div className="font-bold text-sm">{row.employeeName}</div>
                <div className="text-[10px] text-muted-foreground">{row.employeeCode}</div>
              </td>
              <td className="p-4 font-semibold text-slate-700">{row.doorName}</td>
              <td className="p-4 text-center">
                {row.status === "active" ? (
                  <Badge className="bg-rose-500 hover:bg-rose-600 border-none text-[10px] px-3">🔴 ACTIVE</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px] px-3">Inactive</Badge>
                )}
              </td>
              <td className="p-4 text-center font-mono text-muted-foreground">
                {row.lockoutExpiry ? formatDateTime(row.lockoutExpiry) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 4. Main Page Component
export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("attendance");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: doorData = [] } = useQuery<any[]>({ queryKey: ["/api/doors"] });

  const { data: reportData = [], isLoading } = useQuery<any[]>({
    queryKey: ["reports", activeReport, appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([k, v]) => { if (v && k !== "_refresh") params.set(k, String(v)); });
      const res = await fetch(`/api/reports/${activeReport}?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  const handleApply = () => setAppliedFilters({ ...filters, _refresh: Date.now().toString() });
  const currentReport = reportTypes.find((r) => r.id === activeReport)!;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg text-white"><FileText className="w-6 h-6" /></div>
          <h1 className="text-2xl font-bold">Reports Center</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {reportTypes.map((rt) => (
          <button
            key={rt.id}
            onClick={() => { setActiveReport(rt.id); setFilters({}); setAppliedFilters({}); }}
            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${activeReport === rt.id ? `${rt.bgColor} border-primary/20 shadow-sm ring-1 ring-primary/20` : "bg-card hover:bg-muted/50"}`}
          >
            <rt.icon className={`w-5 h-5 mb-2 ${activeReport === rt.id ? rt.color : "text-muted-foreground"}`} />
            <span className="text-[10px] font-bold uppercase">{rt.label}</span>
          </button>
        ))}
      </div>

      <ReportFilters
        filters={filters}
        setFilters={setFilters}
        setAppliedFilters={setAppliedFilters}
        onApply={handleApply}
        people={people}
        devices={doorData}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b py-3">
          <CardTitle className="text-sm font-semibold">
            {currentReport.label} Results ({reportData.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => exportCSV(activeReport, reportData)}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No records found for the selected filters.</div>
          ) : (
            <>
              {activeReport === "attendance" && <AttendanceTable data={reportData} />}
              {activeReport === "door-count" && <DoorCountTable data={reportData} />}
              {activeReport === "cabin-lockout" && <LockoutReportTable data={reportData} />}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function exportCSV(id: string, data: any[]) {
  if (!data.length) return;
  const header = Object.keys(data[0]).join(",");
  const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${id}-report.csv`;
  a.click();
}