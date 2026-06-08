import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import { Input } from "@/components/ui/input";

import {
  Plus,
  Pencil,
  Trash2,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateNoHtml } from "@/lib/validation";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

export default function DesignationPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.DESIGNATION.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const confirm = useConfirm();
  const { toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [search, setSearch] = useState("");

  // const {
  //   data: response,
  //   isLoading,
  //   create,
  //   update,
  //   remove,
  //   isCreating,
  //   isUpdating,
  // } = useCrud<any>(
  //   `/api/designations?page=${page}&pageSize=${pageSize}`,
  //   "Designation",
  // ) as any;

  const [pagedResponse, setPagedResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const crud = useCrud<any>("/api/designations", "Designation") as any;
  // const crud = useCrud<any>("", "Designation") as any;

  const { create, update, remove, isCreating, isUpdating } = crud;

  const fetchDesignations = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/designations?page=${page}&pageSize=${pageSize}&search=${search}`,
      );

      const data = await res.json();

      setPagedResponse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ YE ADD KARO
  useEffect(() => {
    fetchDesignations();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const data = pagedResponse?.data || [];
  const totalPages = pagedResponse?.totalPages || 1;

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const columns = [
    {
      key: "name",
      label: "Designation Name",
      render: (item: any) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "code",
      label: "Code",
      render: (item: any) => (
        <span className="text-muted-foreground">{item.code || "-"}</span>
      ),
    },
    {
      key: "level",
      label: "Level",
      render: (item: any) => (
        <Badge variant="outline">{item.level ?? "-"}</Badge>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item: any) => (
        <span className="text-muted-foreground">{item.description || "-"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) =>
        item.isActive !== false ? (
          <Badge>Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: any) => (
        <div className="flex gap-1">
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              title="Edit Designation" // Simple Tooltip
              onClick={(e) => {
                e.stopPropagation();
                setEdit(item);
                setOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              title="Delete Designation" // Tooltip text
              className="text-destructive"              onClick={async (e) => {
                e.stopPropagation();

                const confirmed = await confirm({
                  title: "Delete Designation?",
                  description: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
                  confirmText: "Yes, Delete",
                  cancelText: "Cancel",
                  variant: "destructive",
                });

                if (!confirmed) return;

                try {
                  // await remove(item.id);

                  // await fetchDesignations();
                  await remove(item.id);

                  setPagedResponse((prev: any) => ({
                    ...prev,
                    data: prev.data.filter((d: any) => d.id !== item.id),
                    totalCount: Math.max(0, (prev.totalCount || 1) - 1),
                  }));

                  toast({
                    title: "Deleted",
                    description: "Designation deleted successfully",
                  });
                } catch (error) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not delete designation",
                  });
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
    // Agar column 'actions' hai toh check karo permissions
    if (col.key === "actions") {
      return canEdit || canDelete;
    }
    return true;
  });

  const handleSubmit = async (formData: any) => {
    try {
      setFieldErrors({});

      // 🛡️ XSS Validation (Shift Page jaisa logic)
      const validationErrors = validateNoHtml(formData);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      // API Call Logic
      if (edit) {
        if (!canEdit) return;
        await update({ id: edit.id, data: formData });
      } else {
        if (!canAdd) return;
        await create(formData);
      }

      await fetchDesignations();

      toast({
        title: "Success",
        description: edit
          ? "Designation updated successfully"
          : "Designation created successfully",
      });

      setOpen(false);
      setEdit(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";

      if (
        msg.toLowerCase().includes("code") ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("unique")
      ) {
        setFieldErrors({
          code: "Designation code already exists",
        });

        return;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: msg || "Something went wrong",
      });
    }
  };
  return (
    <div className="p-4 md:p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          Designation
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Manage Designation for Employees
        </p>
      </div>
      <div className="flex justify-end mb-4">
        {canAdd && (
          <Button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Designation
          </Button>
        )}
      </div>

      {/* TABLE */}
      {/* <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        searchable
        searchKeys={["name", "code", "level", "description"]}
        emptyMessage="No designations found"
      /> */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

        <Input
          placeholder="Search designations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        emptyMessage="No designations found"
      />
      {/* Pagination Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
        {/* Left Side */}
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
          designations
        </div>

        {/* Right Side */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          {/* Go To Page */}
          <div className="flex items-center gap-2">
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

                  if (val >= 1 && val <= totalPages) {
                    setPage(val);
                  }
                }
              }}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-1">
            {/* First */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Prev */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>

            {/* Page Count */}
            <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
              {page} / {totalPages}
            </div>

            {/* Next */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOG */}
      <CrudDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEdit(null);
          setFieldErrors({}); // ✅ reset bhi kar do
        }}
        title={edit ? "Edit Designation" : "Add Designation"}
        fields={[
          { key: "name", label: "Designation Name", required: true },

          {
            key: "code",
            label: "Code",
            required: true,
            disabled: !!edit, // ✅ EDIT mode me read-only
            onChange: (value, form, setForm) => {
              if (edit) return; // extra safety

              setForm({ ...form, code: value });

              setFieldErrors((prev) => ({
                ...prev,
                code: "",
              }));
            },
          },

          { key: "level", label: "Level", type: "number" },
          { key: "description", label: "Description", type: "textarea" },
          {
            key: "isActive",
            label: "Active",
            type: "switch",
            defaultValue: true,
          },
        ]}
        initialData={edit || undefined}
        onSubmit={handleSubmit}
        isPending={isCreating || isUpdating}
        errors={fieldErrors} // 🔥 YE LINE MISSING THI
      />
    </div>
  );
}
