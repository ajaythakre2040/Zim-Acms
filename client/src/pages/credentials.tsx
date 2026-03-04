import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Credential, Person } from "@shared/schema";

const kindLabels: Record<string, string> = { rfid: "RFID", pin: "PIN", biometric: "Biometric", mobile: "Mobile", face: "Face", qr: "QR" };
const statusColors: Record<string, string> = { active: "default", suspended: "secondary", blacklisted: "destructive", inactive: "outline", lost: "destructive", expired: "secondary" };

export default function CredentialsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<Credential>("/api/credentials", "Credential");
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });

  const fields: FieldConfig[] = [
    { key: "personId", label: "Person", type: "select", required: true, options: people.map((p) => ({ value: String(p.id), label: `${p.firstName} ${p.lastName || ""}` })) },
    { key: "kind", label: "Type", type: "select", required: true, options: Object.entries(kindLabels).map(([v, l]) => ({ value: v, label: l })) },
    { key: "cardNumber", label: "Card/ID Number" },
    { key: "facilityCode", label: "Facility Code" },
    { key: "pinCode", label: "PIN Code" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }, { value: "blacklisted", label: "Blacklisted" }, { value: "lost", label: "Lost" }, { value: "expired", label: "Expired" }], defaultValue: "active" },
  ];

  const columns = [
    { key: "person", label: "Person", render: (c: Credential) => { const p = people.find((x) => x.id === c.personId); return p ? `${p.firstName} ${p.lastName || ""}` : `#${c.personId}`; }},
    { key: "kind", label: "Type", render: (c: Credential) => <Badge variant="secondary">{kindLabels[c.kind] || c.kind}</Badge> },
    { key: "cardNumber", label: "Card Number", hideOnMobile: true },
    { key: "status", label: "Status", render: (c: Credential) => <Badge variant={statusColors[c.status || ""] as any}>{c.status}</Badge> },
    { key: "actions", label: "", render: (c: Credential) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(c); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(c.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Credentials" description="Manage access credentials (cards, biometrics, PINs)" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Credential</Button>} />
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={["cardNumber"]} emptyMessage="No credentials registered" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Credential" : "Add Credential"} fields={fields}
        initialData={editing ? { ...editing, personId: String(editing.personId) } : undefined}
        onSubmit={(data) => { data.personId = Number(data.personId); editing ? update({ id: editing.id, data }) : create(data); setDialogOpen(false); setEditing(null); }} isPending={isCreating || isUpdating} />
    </div>
  );
}
