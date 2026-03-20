import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Shift } from "@shared/schema";

export default function ShiftsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<Shift>("/api/shifts", "Shift");

  const fields: FieldConfig[] = [
    { key: "name", label: "Shift Name", required: true },
    { key: "code", label: "Code" },
    { key: "startTime", label: "Start Time", type: "time", required: true },
    { key: "endTime", label: "End Time", type: "time", required: true },
    { key: "breakDuration", label: "Break (mins)", type: "number", defaultValue: 0 },
    { key: "gracePeriod", label: "Grace Period (mins)", type: "number", defaultValue: 15 },
    { key: "fullDayHours", label: "Full Day Hours", type: "number", defaultValue: 8 },
    { key: "halfDayHours", label: "Half Day Hours", type: "number", defaultValue: 4 },
    { key: "lateThresholdMins", label: "Late Threshold (mins)", type: "number", defaultValue: 15 },
    { key: "isNightShift", label: "Night Shift", type: "switch" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const columns = [
    { key: "name", label: "Shift", render: (s: Shift) => <span className="font-medium">{s.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "time", label: "Time", render: (s: Shift) => `${s.startTime} - ${s.endTime}` },
    { key: "hours", label: "Hours", hideOnMobile: true, render: (s: Shift) => `${s.fullDayHours}h` },
    { key: "isNightShift", label: "Night", hideOnMobile: true, render: (s: Shift) => s.isNightShift ? <Badge variant="secondary">Night</Badge> : null },
    { key: "isActive", label: "Status", render: (s: Shift) => s.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    { key: "actions", label: "", render: (s: Shift) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(s); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(s.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Shifts" description="Configure work shifts and schedules" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Shift</Button>} />
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={["name", "code"]} emptyMessage="No shifts configured" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Shift" : "Add Shift"} fields={fields} initialData={editing || undefined}
        onSubmit={(data) => { editing ? update({ id: editing.id, data }) : create(data); setDialogOpen(false); setEditing(null); }} isPending={isCreating || isUpdating} />
    </div>
  );
}
