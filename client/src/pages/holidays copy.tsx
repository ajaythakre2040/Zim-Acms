import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Holiday, Site } from "@shared/schema";

const typeColors: Record<string, string> = { national: "default", state: "secondary", company: "outline", optional: "secondary" };

export default function HolidaysPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<Holiday>("/api/holidays", "Holiday");
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  const fields: FieldConfig[] = [
    { key: "name", label: "Holiday Name", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "holidayType", label: "Type", type: "select", options: [{ value: "national", label: "National" }, { value: "state", label: "State" }, { value: "company", label: "Company" }, { value: "optional", label: "Optional" }], defaultValue: "company" },
    { key: "locationId", label: "Site (optional)", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "description", label: "Description", type: "textarea" },
  ];

  const columns = [
    { key: "name", label: "Holiday", render: (h: Holiday) => <span className="font-medium">{h.name}</span> },
    { key: "date", label: "Date" },
    { key: "holidayType", label: "Type", render: (h: Holiday) => <Badge variant={typeColors[h.holidayType || ""] as any}>{h.holidayType}</Badge> },
    { key: "site", label: "Site", hideOnMobile: true, render: (h: any) => sites.find((s) => s.id === h.locationid)?.name || "All sites" },    { key: "actions", label: "", render: (h: Holiday) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(h); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(h.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Holidays" description="Manage holiday calendar" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Holiday</Button>} />
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={["name"]} emptyMessage="No holidays configured" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Holiday" : "Add Holiday"} fields={fields}
      initialData={editing ? { ...editing, locationId: editing.locationid ? String(editing.locationid) : "" } : undefined}   
      onSubmit={(data) => { if (data.locationId) data.locationId = Number(data.locationId); editing ? update({ id: editing.id, data }) : create(data); setDialogOpen(false); setEditing(null); }} isPending={isCreating || isUpdating} />
    </div>
  );
}
