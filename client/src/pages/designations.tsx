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

export default function DesignationPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(MENU_CONFIG.DESIGNATION.code);
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
    useCrud("/api/designations", "Designation");

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

          <Button
            size="icon"
            variant="ghost"
            title="Delete Designation" // Tooltip text
            className="hover:text-destructive hover:bg-destructive/10 transition-colors" // Red hover effect
            onClick={async (e) => {
              e.stopPropagation();

              // ✅ Add Confirmation Logic
              const confirmed = window.confirm(
                `Are you sure you want to delete the designation "${item.name}"?`,
              );

              if (confirmed) {
                try {
                  await remove(item.id);
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

      // 🛡️ XSS Validation (Shift Page jaisa logic)
      const validationErrors = validateNoHtml(formData);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return; // Stop processing
      }

      // API Call Logic
      if (edit) {
        await update({ id: edit.id, data: formData });
      } else {
        await create(formData);
      }

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

      // Database Unique Constraint Error handling
      if (
        msg.toLowerCase().includes("database") ||
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
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Designation
        </Button>
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "code", "level", "description"]}
        emptyMessage="No designations found"
      />

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
