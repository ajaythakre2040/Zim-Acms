import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Site, Building } from "@shared/schema";

export default function SitesPage() {
  const [siteDialog, setSiteDialog] = useState(false);
  const [buildingDialog, setBuildingDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const siteCrud = useCrud<Site>("/api/sites", "Site");
  const buildingCrud = useCrud<Building>("/api/buildings", "Building");

  useEffect(() => {
    if (siteCrud.refetch) siteCrud.refetch();
  }, []);

  const siteFields: FieldConfig[] = [
    { key: "name", label: "Site Name", required: true },
    { key: "code", label: "Code" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "country", label: "Country" },
    { key: "timezone", label: "Timezone", defaultValue: "Asia/Kolkata" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const buildingFields: FieldConfig[] = [
    { key: "name", label: "Building Name", required: true },
    { key: "code", label: "Code" },
    { key: "locationId", label: "Site", type: "select", required: true, options: siteCrud.data.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "address", label: "Address", type: "textarea" },
    { key: "floorCount", label: "Floor Count", type: "number", defaultValue: 1 },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const siteColumns = [
    { key: "name", label: "Site", render: (s: Site) => <span className="font-medium">{s.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "isActive", label: "Status", render: (s: Site) => s.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    {
      key: "actions", label: "", render: (s: Site) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingSite(s); setSiteDialog(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("Are you sure?")) siteCrud.remove(s.id); }}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    },
  ];

  const buildingColumns = [
    { key: "name", label: "Building", render: (b: Building) => <span className="font-medium">{b.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "site", label: "Site", render: (b: Building) => siteCrud.data.find((s) => s.id === b.locationId)?.name || "-" },
    { key: "isActive", label: "Status", render: (b: Building) => b.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    {
      key: "actions", label: "", render: (b: Building) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingBuilding(b); setBuildingDialog(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("Are you sure?")) buildingCrud.remove(b.id); }}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Sites & Buildings" description="Manage physical locations" />
      <Tabs defaultValue="sites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
        </TabsList>
        <TabsContent value="sites">
          <div className="mb-4"><Button onClick={() => { setEditingSite(null); setSiteDialog(true); setFieldErrors({}); }}><Plus className="w-4 h-4 mr-1" /> Add Site</Button></div>
          <DataTable columns={siteColumns} data={siteCrud.data} isLoading={siteCrud.isLoading} searchable searchKeys={["name", "code", "city"]} />
        </TabsContent>
        <TabsContent value="buildings">
          <div className="mb-4"><Button onClick={() => { setEditingBuilding(null); setBuildingDialog(true); setFieldErrors({}); }}><Plus className="w-4 h-4 mr-1" /> Add Building</Button></div>
          <DataTable columns={buildingColumns} data={buildingCrud.data} isLoading={buildingCrud.isLoading} searchable searchKeys={["name", "code"]} />
        </TabsContent>
      </Tabs>

      {/* Site Dialog */}
      <CrudDialog
        open={siteDialog}
        onClose={() => { setSiteDialog(false); setEditingSite(null); setFieldErrors({}); }}
        title={editingSite ? "Edit Site" : "Add Site"}
        fields={siteFields}
        initialData={editingSite || undefined}
        errors={fieldErrors}
        onSubmit={async (data) => {
          try {
            setFieldErrors({});
            if (editingSite) {
              const { id, msId, createdAt, ...updateData } = data as any;
              await siteCrud.update({ id: editingSite.id, data: updateData });
            } else {
              // Yahan CREATE logic ko try-catch ke andar rakha gaya hai
              await siteCrud.create(data);
            }
            setSiteDialog(false);
            setEditingSite(null);
          } catch (err: any) {
            // Error extraction logic
            const rawError = err.message || "";
            if (rawError.includes("already in use") || rawError.includes("DUPLICATE_CODE")) {
              setFieldErrors({ code: "Duplicate code entry! This code is already used." });
              toast({
                variant: "destructive",
                title: "Validation Error",
                description: "This code is already in use. Please provide a unique value."
              });
            } else {
              toast({
                variant: "destructive",
                title: "Operation Failed",
                description: "An unexpected error occurred. Please try again."
              });
            }
          }
        }}
        isPending={siteCrud.isCreating || siteCrud.isUpdating}
      />

      {/* Building Dialog */}
      <CrudDialog
        open={buildingDialog}
        onClose={() => { setBuildingDialog(false); setEditingBuilding(null); setFieldErrors({}); }}
        title={editingBuilding ? "Edit Building" : "Add Building"}
        fields={buildingFields}
        initialData={editingBuilding ? { ...editingBuilding, locationId: String(editingBuilding.locationId) } : undefined}
        errors={fieldErrors}
        onSubmit={async (data) => {
          try {
            setFieldErrors({});
            const { id, createdAt, ...formData } = data as any;
            formData.locationId = Number(formData.locationId);
            if (editingBuilding) {
              await buildingCrud.update({ id: editingBuilding.id, data: formData });
            } else {
              await buildingCrud.create(formData);
            }
            setBuildingDialog(false);
            setEditingBuilding(null);
          } catch (err: any) {
            const rawError = err.message || "";
            if (rawError.includes("already in use") || rawError.includes("DUPLICATE_CODE")) {
              setFieldErrors({ code: "Duplicate building code." });
              toast({
                variant: "destructive",
                title: "Duplicate Entry",
                description: "This building code already exists."
              });
            } else {
              toast({ variant: "destructive", title: "Error", description: "Failed to save building data." });
            }
          }
        }}
        isPending={buildingCrud.isCreating || buildingCrud.isUpdating}
      />
    </div>
  );
}