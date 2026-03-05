import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { AccessCard, Person } from "@shared/schema";

const statusColors: Record<string, string> = { active: "default", inactive: "secondary", lost: "destructive", expired: "secondary", blocked: "destructive" };

export default function AccessCardsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessCard | null>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<AccessCard>("/api/access-cards", "Access Card");
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });

  const fields: FieldConfig[] = [
    { key: "cardNumber", label: "Card Number", required: true },
    { key: "cardType", label: "Card Type", type: "select", options: [{ value: "employee", label: "Employee" }, { value: "visitor", label: "Visitor" }, { value: "contractor", label: "Contractor" }, { value: "temporary", label: "Temporary" }], defaultValue: "employee" },
    { key: "personId", label: "Assigned To", type: "select", options: people.map((p) => ({ value: String(p.id), label: p.employeeName })) },    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "lost", label: "Lost" }, { value: "expired", label: "Expired" }, { value: "blocked", label: "Blocked" }], defaultValue: "active" },
  ];

  const columns = [
    { key: "cardNumber", label: "Card Number", render: (c: AccessCard) => <span className="font-mono font-medium">{c.cardNumber}</span> },
    { key: "cardType", label: "Type", render: (c: AccessCard) => <Badge variant="secondary">{c.cardType}</Badge> },
    { key: "person", label: "Assigned To", hideOnMobile: true, render: (c: AccessCard) => { const p = people.find((x) => x.id === c.personId); return p ? p.employeeName : "Unassigned"; } },    { key: "status", label: "Status", render: (c: AccessCard) => <Badge variant={statusColors[c.status || ""] as any}>{c.status}</Badge> },
    { key: "actions", label: "", render: (c: AccessCard) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(c); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(c.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Access Cards" description="Manage physical access cards" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Card</Button>} />
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={["cardNumber"]} emptyMessage="No access cards registered" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Card" : "Add Card"} fields={fields}
        initialData={editing ? { ...editing, personId: editing.personId ? String(editing.personId) : "" } : undefined}
        onSubmit={(data) => { if (data.personId) data.personId = Number(data.personId); editing ? update({ id: editing.id, data }) : create(data); setDialogOpen(false); setEditing(null); }} isPending={isCreating || isUpdating} />
    </div>
  );
}
