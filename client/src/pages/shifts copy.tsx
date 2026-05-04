import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Shift } from "@shared/schema";
import { validateNoHtml } from "../lib/validation";

export default function ShiftsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data = [], isLoading, create, update, remove, isCreating, isUpdating } = useCrud<Shift>("/api/shifts", "Shift");

  const fields: FieldConfig[] = [
    { key: "name", label: "Shift Name", required: true },
    // यहाँ disabled: true जोड़ा गया है ताकि यह Read-only रहे
    {
      key: "code",
      label: "Code",
      required: !editing,
      disabled: !!editing
    },
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

    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-left",
      className: "text-left",
      render: (s: Shift) => (
        <div className="flex items-center justify-start gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title="Edit"
            onClick={(e) => { e.stopPropagation(); setEditing(s); setDialogOpen(true); }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Are you sure you want to delete this shift?")) {
                remove(s.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Shifts"
        description="Configure work shifts and schedules"
        action={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Shift
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "code"]}
        emptyMessage="No shifts configured"
      />

      {/* <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        title={editing ? "Edit Shift" : "Add Shift"}
        fields={fields}
        initialData={editing || undefined}
        onSubmit={(formData) => {
          if (editing) {
            update({ id: editing.id, data: formData });
          } else {
            create(formData);
          }
          setDialogOpen(false);
          setEditing(null);
        }}
        isPending={isCreating || isUpdating}
      />
      <CrudDialog
        open={dialogOpen}
        errors={errors} // 👈 Ye prop add karna mat bhulna
        onClose={() => { 
          setDialogOpen(false); 
          setEditing(null); 
          setErrors({}); // Close hone par errors clear karein
        }}
        title={editing ? "Edit Shift" : "Add Shift"}
        fields={fields}
        initialData={editing || undefined}
        onSubmit={async (formData) => { // 👈 async banaya
          try {
            setErrors({}); // Purane errors saaf karein

            // await lagaya taaki backend response ka wait ho
            if (editing) {
              await update({ id: editing.id, data: formData });
            } else {
              await create(formData);
            }

            // ✅ Success par hi close hoga
            setDialogOpen(false);
            setEditing(null);
          } catch (err: any) {
            // ❌ Error hone par yahan aayega
            console.error("Shift save error:", err);
            
            const msg = err.response?.data?.message || err.message || "";
            if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("code")) {
              setErrors({ code: "This shift code is already in use." });
            } else {
              setErrors({ general: "Failed to save shift details." });
            }
          }
        }}
        isPending={isCreating || isUpdating}
      /> */}
      <CrudDialog
        open={dialogOpen}
        errors={errors} // 👈 Ye prop add karna mat bhulna
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
          setErrors({}); // Close hone par errors clear karein
        }}
        title={editing ? "Edit Shift" : "Add Shift"}
        fields={fields}
        initialData={editing || undefined}
        onSubmit={async (formData) => {
          try {
            setErrors({}); // Purane errors clear

            // :fire: COMMON VALIDATION (ALL FIELDS)
            const validationErrors = validateNoHtml(formData);

            if (Object.keys(validationErrors).length > 0) {
              setErrors(validationErrors);
              return; // :x: API call rok do
            }

            // :white_check_mark: Backend call
            if (editing) {
              await update({ id: editing.id, data: formData });
            } else {
              await create(formData);
            }

            // :white_check_mark: Success par close
            setDialogOpen(false);
            setEditing(null);
          } catch (err: any) {
            // ❌ Error hone par yahan aayega
            console.error("Shift save error:", err);

            const msg = err.response?.data?.message || err.message || "";
            if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("code")) {
              setErrors({ code: "This shift code is already in use." });
            } else {
              setErrors({ general: "Failed to save shift details." });
            }
          }
        }}
        isPending={isCreating || isUpdating}
      />
    </div>
  );
}