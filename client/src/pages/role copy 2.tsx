import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CrudDialog } from "@/components/crud-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function RolesPage() {
  const { data, isLoading, create, update, remove } =
    useCrud("/api/roles", "Role");
const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  // ✅ Updated Columns
  const columns = [
    { key: "roleName", label: "Role Name" },
    { key: "code", label: "Code" },
    { key: "description", label: "Description" },

    {
      key: "isActive",
      label: "Status",
      render: (item: any) => (
        <span className={item.isActive ? "text-green-600" : "text-red-600"}>
          {item.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },

    {
      key: "actions",
      label: "Actions",
      render: (item: any) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(`/master-data/roles/edit/${item.id}`)}
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => remove(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-end mb-3">
        <Button
          onClick={() => navigate("/master-data/roles/add")}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Role
        </Button>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} />

      <CrudDialog
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Edit Role" : "Add Role"}
        fields={[
          {
            key: "roleName",
            label: "Role Name",
            required: true,
          },
          {
            key: "code",
            label: "Code",
            required: true,
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
          },
          {
            key: "isActive",
            label: "Is Active",
            type: "switch",
          },
        ]}
        initialData={
          edit || {
            isActive: true, // default value
          }
        }
        onSubmit={(data) =>
          edit ? update({ id: edit.id, data }) : create(data)
        }
      />
    </div>
  );
}