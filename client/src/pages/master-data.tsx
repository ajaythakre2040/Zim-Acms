import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";

function MasterTab({ endpoint, label, fields, nameKey = "name" }: { endpoint: string; label: string; fields: FieldConfig[]; nameKey?: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<any>(endpoint, label);

  const columns = [
    { key: nameKey, label: "Name", render: (item: any) => <span className="font-medium">{item[nameKey]}</span> },
    ...fields.filter((f) => f.key !== nameKey && f.key !== "description" && f.key !== "isActive").slice(0, 2).map((f) => ({
      key: f.key, label: f.label, hideOnMobile: true,
    })),
    { key: "isActive", label: "Status", render: (item: any) => item.isActive !== false ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    { key: "actions", label: "", render: (item: any) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(item); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(item.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="mb-4"><Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add {label}</Button></div>
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={[nameKey]} emptyMessage={`No ${label.toLowerCase()}s`} />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? `Edit ${label}` : `Add ${label}`} fields={fields} initialData={editing || undefined}
        onSubmit={(data) => { editing ? update({ id: editing.id, data }) : create(data); setDialogOpen(false); setEditing(null); }} isPending={isCreating || isUpdating} />
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Master Data" description="Manage departments, designations, categories, companies, and vendors" />
      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
