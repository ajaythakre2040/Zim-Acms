import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateNoHtml } from "@/lib/validation";

export default function CompaniesPage() {
  const { toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data, isLoading, create, update, remove, isCreating, isUpdating } =
    useCrud("/api/companies", "Company");

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

          <Button
            size="icon"
            variant="ghost"
            title="Delete Company"
            className="hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={async (e) => {
              e.stopPropagation();

              const confirmed = window.confirm(
                `Are you sure you want to delete the company "${item.name}"?`,
              );

              if (confirmed) {
                try {
                  await remove(item.id);
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
          ? "Company updated successfully"
          : "Company created successfully",
      });

      setOpen(false);
      setEdit(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";

      // 🔑 Unique Name ya Email Error Handling
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("exists")) {
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
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Company
        </Button>
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "shortName", "email"]}
        emptyMessage="No companies found"
      />

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