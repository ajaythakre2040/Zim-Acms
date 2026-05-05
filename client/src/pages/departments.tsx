import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentsPage() {
  const { toast } = useToast();

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
                description: "Department deleted successfully",
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
      if (edit) {
        await update({ id: edit.id, data: formData });
        toast({
          title: "Success",
          description: "Department updated successfully",
        });
      } else {
        await create(formData);
        toast({
          title: "Success",
          description: "Department created successfully",
        });
      }

      setOpen(false);
      setEdit(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Something went wrong",
      });
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          Department
        </h1>
        <p className="text-sm text-slate-500 font-medium">Manage Departments</p>
      </div>
      <div className="flex justify-end mb-4"></div>
      {/* HEADER */}
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
        }}
        title={edit ? "Edit Department" : "Add Department"}
        fields={[
          { key: "name", label: "Department Name", required: true },
          { key: "code", label: "Department Code", required: true },
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
      />
    </div>
  );
}
