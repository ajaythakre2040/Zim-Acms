import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DesignationPage() {
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
            onClick={async (e) => {
              e.stopPropagation();

              await remove(item.id);

              toast({
                title: "Deleted",
                description: "Designation deleted successfully",
              });
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

      // ✅ ONLY inline error (NO TOAST)
      if (msg.toLowerCase().includes("database")) {
        setFieldErrors({
          code: "Designation code already exists",
        });
        return; // ❗ stop here (no toast)
      }

      // ❌ optional: completely remove this if you don't want ANY error toast
      // toast({
      //   variant: "destructive",
      //   title: "Error",
      //   description: msg || "Something went wrong",
      // });
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
            onChange: (value, form, setForm) => {
              setForm({ ...form, code: value });

              // ✅ error remove on typing
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
