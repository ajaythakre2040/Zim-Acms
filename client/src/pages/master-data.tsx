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

function MasterTab({ endpoint, label, fields, nameKey = "name" }: { endpoint: string; label: string; fields: FieldConfig[]; nameKey?: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { toast } = useToast();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<any>(endpoint, label);
  const { data: devices = [] } = useQuery<Device[]>({ queryKey: ["/api/devices"] });

  // const dynamicFields = fields.map(f => {
  //   if (f.key === "deviceIds") {
  //     return {
  //       ...f,
  //       type: "multi-select",
  //       options: [
  //         ...devices.map((d: Device) => ({ value: String(d.id), label: d.name }))
  //       ]
  //     } as any;
  //   }
  //   return f;
  // });
  const dynamicFields = fields.map(f => {
    if (f.key === "deviceIds") {
      return {
        ...f,
        type: "multi-select",
        options: [
           // All option add karein
          ...devices.map((d: Device) => ({
            value: String(d.msId || d.id), // MS ID ko priority dein
            label: `${d.name} `
          }))
        ]
      } as any;
    }
    return f;
  });
  const columns = [
    {
      key: nameKey,
      label: "Name",
      render: (item: any) => <span className="font-medium">{item[nameKey]}</span>
    },
    ...fields
      .filter((f) => f.key !== nameKey && f.key !== "description" && f.key !== "isActive")
      .slice(0, 2)
      .map((f) => ({
        key: f.key,
        label: f.label,
        hideOnMobile: true,
        render: f.key === "deviceIds"
          ? (item: any) => (
            <span className="text-sm text-muted-foreground">
              {item.assignedDeviceNames || "No Devices"}
            </span>
          )
          : undefined,
      })),
    {
      key: "isActive",
      label: "Status",
      render: (item: any) => item.isActive !== false ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>
    },
    {
      key: "actions",
      label: "",
      render: (item: any) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(item); setDialogOpen(true); }}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(item.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  const handleSubmit = async (formData: any) => {
    setFormErrors({});
    const finalData = { ...formData };

    if (Array.isArray(formData.deviceIds)) {
      if (formData.deviceIds.includes("all")) {
        finalData.deviceIds = devices.map((d: Device) => Number(d.id));
      } else {
        finalData.deviceIds = formData.deviceIds
          .map((id: string) => Number(id))
          .filter((id: number) => !isNaN(id)); // Fixed TypeScript implicit 'any' error
      }
    }

    try {
      if (editing) {
        await update({ id: editing.id, data: finalData });
        toast({ title: "Success", description: `${label} updated successfully.` });
      } else {
        await create(finalData);
        toast({ title: "Success", description: `${label} created successfully.` });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error: any) {
      console.log("Original Error:", error);

      let errorData;

      // 1. Check karein agar error message ke andar JSON chhupa hai
      // Screenshots mein toast '400: {JSON}' dikha raha hai, iska matlab message string hai
      if (typeof error.message === 'string' && error.message.includes('{')) {
        try {
          // JSON nikalne ke liye string ko split karein (400: {..} -> {..})
          const jsonPart = error.message.substring(error.message.indexOf('{'));
          errorData = JSON.parse(jsonPart);
        } catch (e) {
          errorData = error.response?.data || error;
        }
      } else {
        errorData = error.response?.data || error;
      }

      // 2. Extract Clean Message
      const finalMessage = errorData?.message || error.message || "An error occurred";

      if (errorData?.isDuplicate) {
        const msg = finalMessage.toLowerCase();
        const fieldKey = msg.includes("code") ? "code" : "name";

        // FormErrors state update karein taaki Input red ho jaye
        setFormErrors({ [fieldKey]: finalMessage });

        toast({
          variant: "destructive",
          title: "Duplicate Entry",
          description: `The ${fieldKey} you entered is already in use.`, // Clean message
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: finalMessage,
        });
      }
    }
  }
  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add {label}
        </Button>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={[nameKey]} emptyMessage={`No ${label.toLowerCase()}s`} />

      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); setFormErrors({}); }}
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
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Master Data" description="Manage departments, designations, categories, companies, vendors,  and roles" />
      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <MasterTab endpoint="/api/departments" label="Department" fields={[
            { key: "name", label: "Name", required: true },
            { key: "code", label: "Code" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "isActive", label: "Active", type: "switch", defaultValue: true },
          ]} />
        </TabsContent>

        <TabsContent value="designations">
          <MasterTab endpoint="/api/designations" label="Designation" fields={[
            { key: "name", label: "Name", required: true },
            { key: "code", label: "Code" },
            { key: "level", label: "Level", type: "number" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "isActive", label: "Active", type: "switch", defaultValue: true },
          ]} />
        </TabsContent>

        <TabsContent value="categories">
          <MasterTab endpoint="/api/categories" label="Category" fields={[
            { key: "name", label: "Name", required: true },
            { key: "description", label: "Description", type: "textarea" },
            { key: "isActive", label: "Active", type: "switch", defaultValue: true },
          ]} />
        </TabsContent>

        <TabsContent value="companies">
          <MasterTab endpoint="/api/companies" label="Company" fields={[
            { key: "name", label: "Name", required: true },
            { key: "shortName", label: "Short Name" },
            { key: "address", label: "Address", type: "textarea" },
            { key: "email", label: "Email", type: "email" },
            { key: "website", label: "Website" },
            { key: "isActive", label: "Active", type: "switch", defaultValue: true },
          ]} />
        </TabsContent>

        <TabsContent value="vendors">
          <MasterTab endpoint="/api/vendors" label="Vendor" fields={[
            { key: "name", label: "Name", required: true },
            { key: "code", label: "Code" },
            { key: "contactPerson", label: "Contact Person" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email", type: "email" },
            { key: "address", label: "Address", type: "textarea" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "gstNumber", label: "GST Number" },
            { key: "isActive", label: "Active", type: "switch", defaultValue: true },
          ]} />
        </TabsContent>

        <TabsContent value="roles">
          <MasterTab
            endpoint="/api/roles"
            label="Role"
            fields={[
              { key: "name", label: "Role Name", required: true },
              { key: "code", label: "Role Code", required: true },
              {
                key: "deviceIds",
                label: "Assign Devices",
                type: "multi-select",
                options: [],
              },
              { key: "isActive", label: "Active", type: "switch", defaultValue: true }, // Add this
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}