import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Clock, Users, AlertTriangle, Coffee } from "lucide-react";
import type { Attendance, Person, Site } from "@shared/schema";

const statusColors: Record<string, string> = {
  present: "default",
  absent: "destructive",
  late: "secondary",
  half_day: "outline",
  on_leave: "secondary",
};

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: records = [], isLoading } = useQuery<Attendance[]>({ queryKey: [`/api/attendance?date=${date}`] });
  const { data: summary } = useQuery<any>({ queryKey: [`/api/attendance/summary?date=${date}`] });
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/attendance", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/attendance") }); setDialogOpen(false); toast({ title: "Attendance recorded" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fields: FieldConfig[] = [
    { key: "personId", label: "Person", type: "select", required: true, options: people.map((p) => ({ value: String(p.id), label: `${p.employeeName} ${p.employeeCode ? `(${p.employeeCode})` : ""}` })) },    { key: "date", label: "Date", type: "date", required: true, defaultValue: date },
    { key: "status", label: "Status", type: "select", options: [{ value: "present", label: "Present" }, { value: "absent", label: "Absent" }, { value: "late", label: "Late" }, { value: "half_day", label: "Half Day" }, { value: "on_leave", label: "On Leave" }], defaultValue: "present" },
    { key: "locationId", label: "Site", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "workingHours", label: "Working Hours", type: "number" },
    { key: "overtimeHours", label: "Overtime Hours", type: "number" },
    { key: "lateByMins", label: "Late By (mins)", type: "number" },
    { key: "notes", label: "Notes" },
  ];

  const statCards = [
    { label: "Present", value: summary?.present || 0, icon: Users, color: "text-green-600 dark:text-green-400" },
    { label: "Late", value: summary?.late || 0, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
    { label: "Absent", value: summary?.absent || 0, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
    { label: "On Leave", value: summary?.onLeave || 0, icon: Coffee, color: "text-blue-600 dark:text-blue-400" },
  ];

  const columns = [
    // { key: "person", label: "Person", render: (a: Attendance) => { const p = people.find((x) => x.id === a.personId); return p ? `${p.firstName} ${p.lastName || ""}` : `#${a.personId}`; }},
    { key: "person", label: "Person", render: (a: any) => { const p = people.find((x) => x.id === a.personId || x.msId === a.personId); return p ? p.employeeName : `#${a.employeeCode || a.personId}`; } },
    { key: "status", label: "Status", render: (a: Attendance) => <Badge variant={statusColors[a.status || ""] as any}>{(a.status || "").replace("_", " ")}</Badge> },
    { key: "clockIn", label: "Clock In", hideOnMobile: true, render: (a: Attendance) => a.clockIn ? new Date(a.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "clockOut", label: "Clock Out", hideOnMobile: true, render: (a: Attendance) => a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "workingHours", label: "Hours", render: (a: Attendance) => a.workingHours ? `${a.workingHours}h` : "-" },
    { key: "lateByMins", label: "Late", hideOnMobile: true, render: (a: Attendance) => a.lateByMins ? <span className="text-yellow-600 dark:text-yellow-400">{a.lateByMins}m</span> : "-" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Attendance"
        description="Daily attendance tracking and management"
        action={
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-attendance">
            <Plus className="w-4 h-4 mr-1" /> Record Attendance
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" data-testid="input-date" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 flex items-center gap-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={records} isLoading={isLoading} searchable searchKeys={["personId"]} emptyMessage="No attendance records for this date" />

      <CrudDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Record Attendance"
        fields={fields}
        onSubmit={(data) => {
          if (data.personId) data.personId = Number(data.personId);
          if (data.locationId) data.locationId = Number(data.locationId);
          createMut.mutate(data);
        }}
        isPending={createMut.isPending}
      />
    </div>
  );
}
