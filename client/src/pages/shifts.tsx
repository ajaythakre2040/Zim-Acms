import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { usePermission } from "@/hooks/use-permission";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
} from "lucide-react";
import type { Shift } from "@shared/schema";
import { validateNoHtml } from "../lib/validation";
import { MENU_CONFIG } from "../../../server/constant";
import { PaginationSize } from "@/components/ui/pagination";
export default function ShiftsPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.SHIFTS.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // const { data = [], isLoading, create, update, remove, isCreating, isUpdating } = useCrud<Shift>("/api/shifts", "Shift");

  // const { data: response, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<any>(
  //   `/api/shifts?page=${page}&pageSize=${pageSize}`,
  //   "Shift"
  // ) as any;
  const {
    data: response,
    isLoading,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
  } = useCrud<any>("/api/shifts", "Shift") as any;

  const [pagedResponse, setPagedResponse] = useState<any>(null);

  const fetchShifts = async () => {
    const res = await fetch(
      `/api/shifts?page=${page}&pageSize=${pageSize}&search=${search}`,
    );

    const data = await res.json();

    setPagedResponse(data);
  };

  useEffect(() => {
    fetchShifts();
  }, [page, search, pageSize]);

  const shiftsData = pagedResponse?.data || [];
  const totalPages = pagedResponse?.totalPages || 1;
  const [formKey, setFormKey] = useState(0);
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
    {
      key: "breakDuration",
      label: "Break (mins)",
      type: "number",
      defaultValue: 0,
    },
    {
      key: "workingHours",
      label: "Working Hours",
      type: "number",
      disabled: true,
    },
    {
      key: "halfDayHours",
      label: "Half Day Hours",
      type: "number",
      defaultValue: 4,
    },
    {
      key: "thresholdMins",
      label: "Threshold (mins)",
      type: "number",
      defaultValue: 30,
    },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];
  const columns = [
    {
      key: "name",
      label: "Shift",
      render: (s: Shift) => <span className="font-medium">{s.name}</span>,
    },
    { key: "code", label: "Code", hideOnMobile: true },
    {
      key: "time",
      label: "Time",
      render: (s: Shift) => `${s.startTime} - ${s.endTime}`,
    },
    {
      key: "hours",
      label: "Hours",
      hideOnMobile: true,
      render: (s: Shift) => `${s.workingHours}h`,
    },
    {
      key: "isActive",
      label: "Status",
      render: (s: Shift) =>
        s.isActive ? (
          <Badge>Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
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
              onClick={(e) => {
                e.stopPropagation();
                const updatedShift = {
                  ...s,
                  workingHours: calculateWorkingHours(s.startTime, s.endTime),
                };
                setEditing(updatedShift);
                setFormKey((prev) => prev + 1);
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
              onClick={async (e) => {
                e.stopPropagation();

                const confirmed = await confirm({
                  title: "Delete Shift?",
                  description: `Are you sure you want to delete shift "${s.name}"? This action cannot be undone.`,
                  confirmText: "Yes, Delete",
                  cancelText: "Cancel",
                  variant: "destructive",
                });

                if (!confirmed) return;

                try {
                  await remove(s.id);

                  await fetchShifts();
                } catch (err) {
                  console.error("Delete failed", err);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ].filter((col) => {
    if (col.key === "actions") {
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
          canAdd && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormKey((prev) => prev + 1);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Shift
            </Button>
          )
        }
      />
      {/* <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "code"]}
        emptyMessage="No shifts configured"
      /> */}
      <div className="relative max-w-sm mb-4">
        <input
          placeholder="Search shifts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // reset page
          }}
          className="w-full h-9 border rounded-md pl-3"
        />
      </div>
      <DataTable
        columns={columns}
        data={shiftsData} // Sirf shifts ka array bhejein
        isLoading={isLoading}
        searchable={false}
        pageSize={pageSize}
        searchKeys={["name", "code"]}
        emptyMessage="No shifts configured"
      />

      {/* Professional Pagination Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
        {/* Left Side: Stats */}
        <div className="text-sm text-muted-foreground order-2 md:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {(page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, pagedResponse?.totalCount || 0)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {pagedResponse?.totalCount || 0}
          </span>{" "}
          shifts
        </div>

        {/* Right Side: Controls */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          {/* Direct Jump (Professional Touch) */}
          <div className="flex items-center gap-2">
            <PaginationSize
              pageSize={pageSize}
              setPageSize={(val) => {
                setPageSize(val);
                setPage(1); // Page size change hone par 1st page par jayein
              }}
            />
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
                  if (val >= 1 && val <= totalPages) setPage(val);
                }
              }}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-1">
            {/* First Page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <span className="sr-only">First Page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous */}
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

            {/* Page Indicator */}
            <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
              {page} / {totalPages}
            </div>

            {/* Next */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last Page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <span className="sr-only">Last Page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {(canAdd || canEdit) && (
        <CrudDialog
          key={formKey}
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
              return;
            }
            try {
              setErrors({});
              const updatedData = {
                ...formData,
                workingHours: calculateWorkingHours(
                  formData.startTime,
                  formData.endTime,
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

              await fetchShifts();
              setDialogOpen(false);
              setEditing(null);
            } catch (err: any) {
              const msg = err.response?.data?.message || err.message || "";
              if (msg.toLowerCase().includes("code")) {
                setErrors({ code: "Shift code already exists" });
              } else {
                setErrors({ general: "Save failed" });
              }
            }
          }}
          isPending={isCreating || isUpdating}
        />
      )}
    </div>
  );
}
