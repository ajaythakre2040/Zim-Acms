import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Device } from "@shared/schema";
import { validateNoHtml } from "../lib/validation";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

// MasterTab updated to accept fields as a function or array
function MasterTab({
  endpoint,
  label,
  fields,
  nameKey = "name",
}: {
  endpoint: string;
  label: string;
  fields: FieldConfig[] | ((editing: any) => FieldConfig[]);
  nameKey?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { toast } = useToast();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { data, isLoading, create, update, remove, isCreating, isUpdating } =
    useCrud<any>(endpoint, label);
  // const { data: devices = [] } = useQuery<Device[]>({ queryKey: ["/api/devices/role-eligible"] });
  const { data: doors = [] } = useQuery<any[]>({ queryKey: ["/api/doors"] });

  // Evaluate fields based on editing state
  const currentFields = typeof fields === "function" ? fields(editing) : fields;

  const dynamicFields = currentFields.map((f) => {
    if (f.key === "doorIds") {
      return {
        ...f,
        type: "multi-select",
        options: [
          ...doors.map((d: any) => ({
            value: String(d.id),
            label: d.name,
          })),
        ],
      } as any;
    }
    return f;
  });

  const columns = [
    {
      key: nameKey,
      label: "Name",
      render: (item: any) => (
        <span className="font-medium">{item[nameKey]}</span>
      ),
    },
    ...currentFields
      .filter(
        (f) =>
          f.key !== nameKey && f.key !== "description" && f.key !== "isActive",
      )
      .slice(0, 2)
      .map((f) => ({
        key: f.key,
        label: f.label,
        hideOnMobile: true,
        render:
          f.key === "doorIds"
            ? (item: any) => (
              <span className="text-sm text-muted-foreground">
                {item.assignedDoorNames || "No Doors"}
              </span>
            )
            : undefined,
      })),
    {
      key: "isActive",
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
              setEditing(item);
              setDialogOpen(true);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              remove(item.id);
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
      setFormErrors({}); // 1. Reset errors pehle

      // 2. HTML Validation Check (Tumhare function ke hisaab se)
      // Ye function ab pura object check karega aur error object return karega
      const validationErrors = validateNoHtml(formData);

      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "HTML tags are not allowed in the fields.",
        });
        return; // Stop if HTML is found
      }

      // 3. Prepare Payload (Converting IDs to Numbers)
      const finalData = { ...formData };
      if (Array.isArray(formData.doorIds)) {
        finalData.doorIds = formData.doorIds
          .map((id: string) => Number(id))
          .filter((id: number) => !isNaN(id));
      }

      // 4. API Operation
      if (editing) {
        await update({ id: editing.id, data: finalData });
        toast({
          title: "Success",
          description: `${label} updated successfully.`,
        });
      } else {
        await create(finalData);
        toast({
          title: "Success",
          description: `${label} created successfully.`,
        });
      }

      // 5. Success path
      setDialogOpen(false);
      setEditing(null);
    } catch (error: any) {
      let errorData;

      if (typeof error.message === "string" && error.message.includes("{")) {
        try {
          const jsonPart = error.message.substring(error.message.indexOf("{"));
          errorData = JSON.parse(jsonPart);
        } catch (e) {
          errorData = error.response?.data || error;
        }
      } else {
        errorData = error.response?.data || error;
      }

      const finalMessage =
        errorData?.message || error.message || "An error occurred";

      if (errorData?.isDuplicate) {
        const msg = finalMessage.toLowerCase();
        const fieldKey = msg.includes("code") ? "code" : "name";

        setFormErrors({ [fieldKey]: finalMessage });

        toast({
          variant: "destructive",
          title: "Duplicate Entry",
          description: `The ${fieldKey} you entered is already in use.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: finalMessage,
        });
      }
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add {label}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={[nameKey]}
        emptyMessage={`No ${label.toLowerCase()}s`}
      />
      <CrudDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
          setFormErrors({});
        }}
        title={editing ? `Edit ${label}` : `Add ${label}`}
        fields={dynamicFields as any}
        initialData={editing || undefined}
        onSubmit={handleSubmit}
        isPending={isCreating || isUpdating}
        errors={formErrors}
      />
    </div>
  );
}

export default function MasterDataPage() {
    const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(MENU_CONFIG.MASTER_DATA.code);
    if (!canView) {
      return (
        <div className="p-6 text-center text-muted-foreground">
          You do not have permission to view this page.
        </div>
      );
    }
    
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* <PageHeader title="Master Data" description="Manage designations, categories, companies and departments " /> */}


    </div>
  );
}
