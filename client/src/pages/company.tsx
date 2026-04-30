import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CompaniesPage() {
  const { toast } = useToast();

  const { data, isLoading, create, update, remove, isCreating, isUpdating } =
    useCrud("/api/companies", "Company");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const columns = [
    {
      key: "name",
      label: "Company Name",
      render: (item: any) => (
        <span className="font-medium">{item.name}</span>
      ),
    },
    {
      key: "shortName",
      label: "Short Name",
      render: (item: any) => (
        <span className="text-muted-foreground">
          {item.shortName || "-"}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (item: any) => (
        <span className="text-muted-foreground">
          {item.email || "-"}
        </span>
      ),
    },
    {
      key: "website",
      label: "Website",
      render: (item: any) => (
        <span className="text-muted-foreground">
          {item.website || "-"}
        </span>
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
                description: "Company deleted successfully",
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
          description: "Company updated successfully",
        });
      } else {
        await create(formData);
        toast({
          title: "Success",
          description: "Company created successfully",
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

      {/* HEADER */}
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
        }}
        title={edit ? "Edit Company" : "Add Company"}
        fields={[
          { key: "name", label: "Company Name", required: true },
          { key: "shortName", label: "Short Name",  },
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
      />
    </div>
  );
}