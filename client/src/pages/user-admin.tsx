import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Pencil } from "lucide-react";
import type { UserProfile } from "@shared/schema";
import type { User } from "@shared/models/auth";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  staff: "Staff",
  security_admin: "Security Admin",
  worker: "Worker",
  employee: "Employee",
  reception: "Reception",
  gate_security: "Gate Security",
};

const roleColors: Record<string, string> = {
  super_admin: "destructive",
  security_admin: "default",
  staff: "secondary",
  worker: "secondary",
  employee: "outline",
  reception: "secondary",
  gate_security: "secondary",
};

export default function UserAdminPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  const { data: profiles = [], isLoading } = useQuery<UserProfile[]>({ queryKey: ["/api/user-profiles"] });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/user-profiles", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] }); setDialogOpen(false); toast({ title: "Profile created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const r = await apiRequest("PUT", `/api/user-profiles/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] }); setDialogOpen(false); setEditing(null); toast({ title: "Profile updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fields: FieldConfig[] = [
    { key: "userId", label: "User ID", required: true },
    { key: "role", label: "Role", type: "select", required: true, options: Object.entries(roleLabels).map(([v, l]) => ({ value: v, label: l })), defaultValue: "employee" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "phone", label: "Phone" },
    { key: "employeeId", label: "Employee ID" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const columns = [
    { key: "userId", label: "User", render: (p: UserProfile) => (
      <div className="flex items-center gap-2">
        <Avatar className="w-8 h-8"><AvatarFallback className="text-xs">{(p.userId || "?")[0].toUpperCase()}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{p.userId}</p>
          {p.department && <p className="text-xs text-muted-foreground">{p.department}</p>}
        </div>
      </div>
    )},
    { key: "role", label: "Role", render: (p: UserProfile) => <Badge variant={roleColors[p.role] as any}>{roleLabels[p.role] || p.role}</Badge> },
    { key: "designation", label: "Designation", hideOnMobile: true },
    { key: "isActive", label: "Status", render: (p: UserProfile) => p.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge> },
    { key: "actions", label: "", render: (p: UserProfile) => (
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(p); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="User Administration" description="Manage user roles and permissions" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Profile</Button>} />
      <DataTable columns={columns} data={profiles} isLoading={isLoading} searchable searchKeys={["userId", "role", "department"]} emptyMessage="No user profiles" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Profile" : "Add Profile"} fields={fields} initialData={editing || undefined}
        onSubmit={(data) => editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data)} isPending={createMut.isPending || updateMut.isPending} />
    </div>
  );
}
