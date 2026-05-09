import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateNoHtml } from "@/lib/validation";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

export default function DepartmentsPage() {
   const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(MENU_CONFIG.DEPARTMENT.code);
        if (!canView) {
          return (
            <div className="p-6 text-center text-muted-foreground">
              You do not have permission to view this page.
            </div>
          );
        }
  const { toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data, isLoading, create, update, remove, isCreating, isUpdating } =
    useCrud("/api/departments", "Department");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const columns = [
    {
      key: "name",
      label: "Department Name",
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
          <Button
            size="icon"
            variant="ghost"
            title="Edit Department"
            onClick={(e) => {
              e.stopPropagation();
              setEdit(item);
              setOpen(true);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            title="Delete Department"
            className="hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={async (e) => {
              e.stopPropagation();
              const confirmed = window.confirm(
                `Are you sure you want to delete the department "${item.name}"?`,
              );

              if (confirmed) {
                try {
                  await remove(item.id);
                  toast({
                    title: "Deleted",
                    description: "Department deleted successfully",
                  });
                } catch (err: any) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: err.message || "Failed to delete department",
                  });
                }
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (formData: any) => {
    try {
      setFieldErrors({});

      // 🛡️ XSS Validation (Designation jaisa logic)
      const validationErrors = validateNoHtml(formData);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      // 🚀 API Call Logic
      if (edit) {
        await update({ id: edit.id, data: formData });
      } else {
        await create(formData);
      }

      toast({
        title: "Success",
        description: edit
          ? "Department updated successfully"
          : "Department created successfully",
      });

      setOpen(false);
      setEdit(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";

      // 🔑 Unique Code Error (Database check)
      if (
        msg.toLowerCase().includes("database") ||
        msg.toLowerCase().includes("unique")
      ) {
        setFieldErrors({
          code: "Department code already exists",
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
          Department
        </h1>
        <p className="text-sm text-slate-500 font-medium">Manage Departments</p>
      </div>

      <div className="flex justify-end mb-4">
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Department
        </Button>
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "code", "description"]}
        emptyMessage="No departments found"
      />

      {/* DIALOG */}
      <CrudDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEdit(null);
          setFieldErrors({}); // ✅ Reset errors on close
        }}
        title={edit ? "Edit Department" : "Add Department"}
        fields={[
          { key: "name", label: "Department Name", required: true },
          {
            key: "code",
            label: "Department Code",
            required: true,
            disabled: !!edit, // ✅ EDIT mode me readonly
            onChange: (value, form, setForm) => {
              if (edit) return; // safety

              setForm({ ...form, code: value });

              setFieldErrors((prev) => ({
                ...prev,
                code: "",
              }));
            },
          },
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
        errors={fieldErrors} // 🔥 Ye prop pass hona zaroori hai
      />
    </div>
  );
}
