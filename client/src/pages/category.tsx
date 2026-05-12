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

export default function CategoriesPage() {
    const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(MENU_CONFIG.CATEGORY.code);
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
    useCrud("/api/categories", "Category");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const columns = [
    {
      key: "name",
      label: "Category Name",
      render: (item: any) => <span className="font-medium">{item.name}</span>,
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
            title="Edit Category"
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
            title="Delete Category"
            className="hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={async (e) => {
              e.stopPropagation();

              const confirmed = window.confirm(
                `Are you sure you want to delete the category "${item.name}"?`,
              );

              if (confirmed) {
                try {
                  await remove(item.id);
                  toast({
                    title: "Deleted",
                    description: "Category deleted successfully",
                  });
                } catch (err: any) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: err.message || "Failed to delete category",
                  });
                }
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          )}
        </div>
      ),
    },
  ].filter(col => {
    if (col.key === 'actions') {
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

      toast({
        title: "Success",
        description: edit
          ? "Category updated successfully"
          : "Category created successfully",
      });

      setOpen(false);
      setEdit(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";

      // 🔑 Unique Name Error Handling
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("exists")) {
        setFieldErrors({
          name: "This category name already exists",
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
          Category
        </h1>
        <p className="text-sm text-slate-500 font-medium">Manage Categories</p>
      </div>

      <div className="flex justify-end mb-4">
        {canAdd && (
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Category
        </Button>
        )}
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "description"]}
        emptyMessage="No categories found"
      />

      {/* DIALOG */}
      <CrudDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEdit(null);
          setFieldErrors({}); // Reset errors
        }}
        title={edit ? "Edit Category" : "Add Category"}
        fields={[
          {
            key: "name",
            label: "Category Name",
            required: true,
            onChange: (value, form, setForm) => {
              setForm({ ...form, name: value });
              setFieldErrors((prev) => ({ ...prev, name: "" })); // Clear error on type
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
        errors={fieldErrors} // 🔥 Important
      />
    </div>
  );
}