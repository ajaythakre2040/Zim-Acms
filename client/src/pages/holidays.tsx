import { useEffect, useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Holiday, Site } from "@shared/schema";
import { validateNoHtml } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";
import { MENU_CONFIG } from "../../../server/constant";
import { usePermission } from "@/hooks/use-permission";

const typeColors: Record<string, string> = {
  national: "default",
  state: "secondary",
  company: "outline",
  optional: "secondary",
};

type PaginatedResponse<T> = {
  data: T[];
  totalPages: number;
  totalCount: number;
};
export default function HolidaysPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.HOLIDAYS.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  // const {
  //   data = [],
  //   isLoading,
  //   create,
  //   update,
  //   remove,
  //   isCreating,
  //   isUpdating,
  // } = useCrud<Holiday>("/api/holidays", "Holiday");

  const [pagedResponse, setPagedResponse] = useState<
    PaginatedResponse<Holiday>
  >({
    data: [],
    totalPages: 1,
    totalCount: 0,
  });

  const { isLoading, create, update, remove, isCreating, isUpdating } =
    useCrud<any>("/api/holidays", "Holiday");

  const fetchHolidays = async () => {
    const res = await fetch(`/api/holidays?page=${page}&pageSize=${pageSize}`);

    const data = await res.json();

    setPagedResponse(data);
  };

  useEffect(() => {
    fetchHolidays();
  }, [page]);

  const data = pagedResponse?.data || [];
  const totalPages = pagedResponse?.totalPages || 1;
  const totalCount = pagedResponse?.totalCount || 0;

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fields: FieldConfig[] = [
    {
      key: "name",
      label: "Holiday Name",
      required: true,
      onChange: (value, form, setForm) => {
        setForm({ ...form, name: value });
        setFieldErrors((prev) => ({ ...prev, name: "" }));
      },
    },
    { key: "date", label: "Date", type: "date", required: true },
    {
      key: "holidayType",
      label: "Type",
      type: "select",
      options: [
        { value: "national", label: "National" },
        { value: "state", label: "State" },
        { value: "company", label: "Company" },
        { value: "optional", label: "Optional" },
      ],
      defaultValue: "company",
    },
    // { key: "locationId", label: "Site (optional)", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "description", label: "Description", type: "textarea" },
  ];

  const columns = [
    {
      key: "name",
      label: "Holiday",
      render: (h: Holiday) => <span className="font-medium">{h.name}</span>,
    },
    { key: "date", label: "Date" },
    {
      key: "holidayType",
      label: "Type",
      render: (h: Holiday) => (
        <Badge variant={typeColors[h.holidayType || ""] as any}>
          {h.holidayType}
        </Badge>
      ),
    },
    // { key: "site", label: "Site", hideOnMobile: true, render: (h: any) => sites.find((s) => s.id === h.locationid)?.name || "All sites" },

    // UPDATED ACTIONS COLUMN
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-left",
      className: "text-left",
      render: (h: Holiday) => (
        <div className="flex items-center justify-start gap-1">
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              // disabled={!canEdit}

              className="h-8 w-8"
              title="Edit"
              onClick={(e) => {
                // if (!canEdit) return;

                e.stopPropagation();
                setEditing(h);
                setFieldErrors({});
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
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete"
              onClick={async (e) => {
                e.stopPropagation();

                const deleteId = h.id || (h as any).msId;

                if (
                  window.confirm(
                    "Are you sure you want to delete this holiday?",
                  )
                ) {
                  await remove(deleteId);

                  setTimeout(async () => {
                    await fetchHolidays();
                  }, 300);
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
        title="Holidays"
        description="Manage holiday calendar"
        action={
          canAdd && (
            <Button
              onClick={() => {
                setEditing(null);
                setFieldErrors({});
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Holiday
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name"]}
        emptyMessage="No holidays configured"
      />
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {(page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, totalCount)}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalCount}</span>{" "}
          holidays
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>

          <div className="px-3 py-1 border rounded text-sm font-medium">
            {page} / {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
      {(canAdd || canEdit) && (
        <CrudDialog
          open={dialogOpen}
          errors={fieldErrors}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
            setFieldErrors({}); // ✅ reset errors
          }}
          title={editing ? "Edit Holiday" : "Add Holiday"}
          fields={fields}
          initialData={
            editing
              ? {
                  ...editing,
                  locationId: editing.locationid
                    ? String(editing.locationid)
                    : "",
                }
              : undefined
          }
          onSubmit={async (formData) => {
            try {
              setFieldErrors({});

              // 🛡️ XSS Validation
              const validationErrors = validateNoHtml(formData);
              if (Object.keys(validationErrors).length > 0) {
                setFieldErrors(validationErrors);
                return;
              }

              if (formData.locationId) {
                formData.locationId = Number(formData.locationId);
              }

              // 🚀 API Call
              if (editing) {
                const updateId = editing.id || (editing as any).msId;

                await update({
                  id: updateId,
                  data: formData,
                });
              } else {
                await create(formData);
              }

              await fetchHolidays();

              toast({
                title: "Success",
                description: editing
                  ? "Holiday updated successfully"
                  : "Holiday created successfully",
              });

              setDialogOpen(false);
              setEditing(null);
            } catch (err: any) {
              toast({
                variant: "destructive",
                title: "Error",
                description: err?.message || "Something went wrong",
              });
            }
          }}
          isPending={isCreating || isUpdating}
        />
      )}
    </div>
  );
}
