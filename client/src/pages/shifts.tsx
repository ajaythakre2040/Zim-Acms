import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { usePermission } from "@/hooks/use-permission"; 
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Shift } from "@shared/schema";
import { validateNoHtml } from "../lib/validation";
import { MENU_CONFIG } from "../../../server/constant";

export default function ShiftsPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(MENU_CONFIG.SHIFTS.code);
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data = [], isLoading, create, update, remove, isCreating, isUpdating } = useCrud<Shift>("/api/shifts", "Shift");
  const [formKey, setFormKey] = useState(0); // 🔥 force re-render

  const calculateWorkingHours = (start: string, end: string) => {
    if (!start || !end) return 0;

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;

    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const diff = endMinutes - startMinutes;
    return +(diff / 60).toFixed(2);
  };

  // 🔥 FIELDS
  const fields: FieldConfig[] = [
    { key: "name", label: "Shift Name", required: true },
    {
      key: "code",
      label: "Code",
      required: !editing,
      disabled: !!editing,
    },
    {
      key: "startTime",
      label: "Start Time",
      type: "time",
      required: true,
    },
    {
      key: "endTime",
      label: "End Time",
      type: "time",
      required: true,
    },
    { key: "breakDuration", label: "Break (mins)", type: "number", defaultValue: 0 },

    // 🔥 LIVE DISPLAY
    {
      key: "workingHours",
      label: "Working Hours",
      type: "number",
      disabled: true,
    },

    { key: "halfDayHours", label: "Half Day Hours", type: "number", defaultValue: 4 },
    { key: "thresholdMins", label: "Threshold (mins)", type: "number", defaultValue: 30 },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  // 🔥 COLUMNS
  const columns = [
    { key: "name", label: "Shift", render: (s: Shift) => <span className="font-medium">{s.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "time", label: "Time", render: (s: Shift) => `${s.startTime} - ${s.endTime}` },
    { key: "hours", label: "Hours", hideOnMobile: true, render: (s: Shift) => `${s.workingHours}h` },
    {
      key: "isActive",
      label: "Status",
      render: (s: Shift) =>
        s.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },

    {
      key: "actions",
      label: "Actions",
      render: (s: Shift) => (
        <div className="flex gap-1">
          {canEdit && (
          <Button
            size="icon"
            variant="ghost"
            // disabled={!canEdit}
            onClick={(e) => {
              // if (!canEdit) return;
              e.stopPropagation();

              const updatedShift = {
                ...s,
                workingHours: calculateWorkingHours(s.startTime, s.endTime),
              };

              setEditing(updatedShift);
              setFormKey((prev) => prev + 1); // 🔥 force refresh
              setDialogOpen(true);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          )}
          {canDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete shift?")) remove(s.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          )}
        </div>
      ),
    },
  ].filter(col => {
    // AGER 'actions' column hai aur na edit ki permission hai na delete ki, toh column hata do
    if (col.key === 'actions') {
      return canEdit || canDelete;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Shifts"
        description="Configure work shifts and schedules"
        action={
          canAdd &&
          <Button
            onClick={() => {
              setEditing(null);
              setFormKey((prev) => prev + 1); // 🔥 reset form
              setDialogOpen(true);
            }}
          >
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
      {(canAdd || canEdit) && (
      <CrudDialog
        key={formKey} // 🔥 FORCE RERENDER
        open={dialogOpen}
        errors={errors}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
          setErrors({});
        }}
        title={editing ? "Edit Shift" : "Add Shift"}
        fields={fields}
        initialData={editing || undefined}
        onSubmit={async (formData) => {
          if ((editing && !canEdit) || (!editing && !canAdd)) {
          try {
            setErrors({});

            const updatedData = {
              ...formData,
              workingHours: calculateWorkingHours(
                formData.startTime,
                formData.endTime
              ),
            };

            const validationErrors = validateNoHtml(updatedData);
            if (Object.keys(validationErrors).length > 0) {
              setErrors(validationErrors);
              return;
            }

            if (editing) {
              await update({ id: editing.id, data: updatedData });
            } else {
              await create(updatedData);
            }

            setDialogOpen(false);
            setEditing(null);
          } catch (err: any) {
            const msg = err.response?.data?.message || err.message || "";
            if (msg.toLowerCase().includes("code")) {
              setErrors({ code: "Shift code already exists" });
            } else {
              setErrors({ general: "Save failed" });
            }
          }}
        }}
        isPending={isCreating || isUpdating}
      />
      )}
    </div>
  );
}