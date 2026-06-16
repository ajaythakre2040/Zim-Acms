import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
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
import { useToast } from "@/hooks/use-toast";
import { validateNoHtml } from "@/lib/validation";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";
import { PaginationSize } from "@/components/ui/pagination";

export default function CompaniesPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.COMPANY.code,
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
  const [pageSize, setPageSize] = useState(10);
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
  //   `/api/companies?page=${page}&pageSize=${pageSize}`,
  //   "Company",
  // ) as any;
  const [pagedResponse, setPagedResponse] = useState<any>(null);

  const { isLoading, create, update, remove, isCreating, isUpdating } =
    useCrud<any>("/api/companies", "Company") as any;

  const fetchCompanies = async () => {
    const res = await fetch(
      `/api/companies?page=${page}&pageSize=${pageSize}&search=${search}`,
    );

    const data = await res.json();
    setPagedResponse(data);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 300);

    return () => clearTimeout(timer);
  }, [page, search, pageSize]);

  const data = pagedResponse?.data || [];
  const totalPages = pagedResponse?.totalPages || 1;

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const columns = [
    {
      key: "name",
      label: "Company Name",
      render: (item: any) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "shortName",
      label: "Short Name",
      render: (item: any) => (
        <span className="text-muted-foreground">{item.shortName || "-"}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (item: any) => (
        <span className="text-muted-foreground">{item.email || "-"}</span>
      ),
    },
    {
      key: "website",
      label: "Website",
      render: (item: any) => (
        <span className="text-muted-foreground">{item.website || "-"}</span>
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
              title="Edit Company"
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
              title="Delete Company"
              className="text-destructive"
              onClick={async (e) => {
                e.stopPropagation();

                const confirmed = await confirm({
                  title: "Delete Company?",
                  description: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
                  confirmText: "Yes, Delete",
                  cancelText: "Cancel",
                  variant: "destructive",
                });

                if (!confirmed) return;

                try {
                  await remove(item.id);

                  // 🔥 INSTANT UI UPDATE (NO REFRESH NEEDED)
                  setPagedResponse((prev: any) => {
                    if (!prev) return prev;

                    return {
                      ...prev,
                      data: prev.data.filter((c: any) => c.id !== item.id),
                      totalCount: Math.max((prev.totalCount || 1) - 1, 0),
                    };
                  });

                  toast({
                    title: "Deleted",
                    description: "Company deleted successfully",
                  });
                } catch (err: any) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: err.message || "Failed to delete company",
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
    // AGER 'actions' column hai aur na edit ki permission hai na delete ki, toh column hata do
    if (col.key === "actions") {
      return canEdit || canDelete;
    }
    return true;
  });

  const handleSubmit = async (formData: any) => {
    try {
      setFieldErrors({});

      // 🛡️ XSS Validation
      const validationErrors = validateNoHtml(formData);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      // 🚀 API Call
      if (edit) {
        await update({ id: edit.id, data: formData });
      } else {
        await create(formData);
      }

      await fetchCompanies();

      toast({
        title: "Success",
        description: edit
          ? "Company updated successfully"
          : "Company created successfully",
      });

      setOpen(false);
      setEdit(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";

      // 🔑 Unique Name ya Email Error Handling
      if (
        msg.toLowerCase().includes("unique") ||
        msg.toLowerCase().includes("exists")
      ) {
        setFieldErrors({
          name: "This company name or email already exists",
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
          Company
        </h1>
        <p className="text-sm text-slate-500 font-medium">Manage Companies</p>
      </div>

      <div className="flex justify-end mb-4">
        {canAdd && (
          <Button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Company
          </Button>
        )}
      </div>

      {/* TABLE */}
      {/* <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "shortName", "email"]}
        emptyMessage="No companies found"
      /> */}

      <div className="relative max-w-sm mb-4">
        <input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // IMPORTANT reset page
          }}
          className="pl-3 w-full h-9 border rounded-md"
        />
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        pageSize={pageSize}
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
          companies
        </div>

        {/* Right Side */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          {/* Go To Page */}
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

                  if (val >= 1 && val <= totalPages) {
                    setPage(val);
                  }
                }
              }}
            />
          </div>

          {/* Navigation Buttons */}
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

            {/* Page Indicator */}
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
          setFieldErrors({}); // Reset errors
        }}
        title={edit ? "Edit Company" : "Add Company"}
        fields={[
          {
            key: "name",
            label: "Company Name",
            required: true,
            onChange: (value, form, setForm) => {
              setForm({ ...form, name: value });
              setFieldErrors((prev) => ({ ...prev, name: "" })); // Clear error on type
            },
          },
          { key: "shortName", label: "Short Name" },
          { key: "email", label: "Email", type: "email" },
          { key: "website", label: "Website" },
          { key: "address", label: "Address", type: "textarea" },
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
        errors={fieldErrors} // 🔥 Important
      />
    </div>
  );
}
