import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { AccessRule, Person, Site, Zone } from "@shared/schema";

export default function AccessRulesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessRule | null>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<AccessRule>("/api/access-rules", "Access Rule");
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ["/api/zones"] });

  const fields: FieldConfig[] = [
    { key: "name", label: "Rule Name", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "personId", label: "Person", type: "select", options: people.map((p) => ({ value: String(p.id), label: `${p.firstName} ${p.lastName || ""}` })) },
    { key: "siteId", label: "Site", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "zoneId", label: "Zone", type: "select", options: zones.map((z) => ({ value: String(z.id), label: z.name })) },
    { key: "accessType", label: "Access Type", type: "select", options: [{ value: "permanent", label: "Permanent" }, { value: "temporary", label: "Temporary" }, { value: "scheduled", label: "Scheduled" }], defaultValue: "permanent" },
    { key: "validFrom", label: "Valid From", type: "date" },
    { key: "validTo", label: "Valid To", type: "date" },
    { key: "timeFrom", label: "Time From", type: "time" },
    { key: "timeTo", label: "Time To", type: "time" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const columns = [
    { key: "name", label: "Rule Name", render: (r: AccessRule) => <span className="font-medium">{r.name}</span> },
    { key: "accessType", label: "Type", render: (r: AccessRule) => <Badge variant="secondary">{r.accessType}</Badge> },
    { key: "person", label: "Person", hideOnMobile: true, render: (r: AccessRule) => { const p = people.find((x) => x.id === r.personId); return p ? `${p.firstName} ${p.lastName || ""}` : "All"; }},
    { key: "site", label: "Site", hideOnMobile: true, render: (r: AccessRule) => sites.find((s) => s.id === r.siteId)?.name || "All" },
    { key: "isActive", label: "Status", render: (r: AccessRule) => r.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    { key: "actions", label: "", render: (r: AccessRule) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(r); setDialogOpen(true); }} data-testid={`button-edit-rule-${r.id}`}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(r.id); }} data-testid={`button-delete-rule-${r.id}`}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Access Rules" description="Define who can access what and when" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }} data-testid="button-add-rule"><Plus className="w-4 h-4 mr-1" /> Add Rule</Button>} />
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={["name", "accessType"]} emptyMessage="No access rules defined" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Access Rule" : "Add Access Rule"} fields={fields}
        initialData={editing ? { ...editing, personId: editing.personId ? String(editing.personId) : "", siteId: editing.siteId ? String(editing.siteId) : "", zoneId: editing.zoneId ? String(editing.zoneId) : "" } : undefined}
        onSubmit={(data) => {
          if (data.personId) data.personId = Number(data.personId);
          if (data.siteId) data.siteId = Number(data.siteId);
          if (data.zoneId) data.zoneId = Number(data.zoneId);
          editing ? update({ id: editing.id, data }) : create(data);
          setDialogOpen(false); setEditing(null);
        }} isPending={isCreating || isUpdating} />
    </div>
  );
}
