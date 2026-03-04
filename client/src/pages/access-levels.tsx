import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { AccessLevel } from "@shared/schema";

export default function AccessLevelsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessLevel | null>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<AccessLevel>("/api/access-levels", "Access Level");

  const fields: FieldConfig[] = [
    { key: "name", label: "Level Name", required: true },
    { key: "code", label: "Code" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "priority", label: "Priority", type: "number", defaultValue: 1 },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const columns = [
    { key: "name", label: "Name", render: (l: AccessLevel) => <span className="font-medium">{l.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "priority", label: "Priority", render: (l: AccessLevel) => <Badge variant="secondary">P{l.priority}</Badge> },
    { key: "isActive", label: "Status", render: (l: AccessLevel) => l.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    { key: "actions", label: "", render: (l: AccessLevel) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(l); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(l.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Access Levels" description="Define access permission levels" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Level</Button>} />
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={["name", "code"]} emptyMessage="No access levels defined" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Level" : "Add Level"} fields={fields} initialData={editing || undefined}
        onSubmit={(data) => { editing ? update({ id: editing.id, data }) : create(data); setDialogOpen(false); setEditing(null); }} isPending={isCreating || isUpdating} />
    </div>
  );
}
