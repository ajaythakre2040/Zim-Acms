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
import type { Person, Department, Designation, Company, Category, Site } from "@shared/schema";

const statusColors: Record<string, string> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};

const personTypeLabels: Record<string, string> = {
  employee: "Employee",
  contractor: "Contractor",
  visitor: "Visitor",
  intern: "Intern",
  consultant: "Consultant",
};

export default function PeoplePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const { toast } = useToast();

  const { data: people = [], isLoading } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: designations = [] } = useQuery<Designation[]>({ queryKey: ["/api/designations"] });
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  const createMut = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/people", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/people"] }); setDialogOpen(false); toast({ title: "Person created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const r = await apiRequest("PUT", `/api/people/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/people"] }); setDialogOpen(false); setEditing(null); toast({ title: "Person updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fields: FieldConfig[] = [
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "employeeId", label: "Employee ID" },
    { key: "employeeCode", label: "Employee Code" },
    { key: "personType", label: "Type", type: "select", options: Object.entries(personTypeLabels).map(([v, l]) => ({ value: v, label: l })), defaultValue: "employee" },
    { key: "gender", label: "Gender", type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }] },
    { key: "departmentId", label: "Department", type: "select", options: departments.map((d) => ({ value: String(d.id), label: d.name })) },
    { key: "designationId", label: "Designation", type: "select", options: designations.map((d) => ({ value: String(d.id), label: d.name })) },
    { key: "companyId", label: "Company", type: "select", options: companies.map((c) => ({ value: String(c.id), label: c.name })) },
    { key: "categoryId", label: "Category", type: "select", options: categories.map((c) => ({ value: String(c.id), label: c.name })) },
    { key: "siteId", label: "Site", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "dateOfJoining", label: "Date of Joining", type: "date" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "suspended", label: "Suspended" }], defaultValue: "active" },
    { key: "riskTier", label: "Risk Tier (1-5)", type: "number" },
  ];

  const columns = [
    {
      key: "name", label: "Name",
      render: (p: Person) => (
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">{(p.firstName || "?")[0]}{(p.lastName || "")[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{p.firstName} {p.lastName || ""}</p>
            <p className="text-xs text-muted-foreground truncate">{p.email || p.employeeId || ""}</p>
          </div>
        </div>
      ),
    },
    { key: "employeeId", label: "Emp ID", hideOnMobile: true },
    {
      key: "personType", label: "Type", hideOnMobile: true,
      render: (p: Person) => <Badge variant="secondary">{personTypeLabels[p.personType || "employee"]}</Badge>,
    },
    {
      key: "departmentId", label: "Department", hideOnMobile: true,
      render: (p: Person) => departments.find((d) => d.id === p.departmentId)?.name || "-",
    },
    {
      key: "status", label: "Status",
      render: (p: Person) => <Badge variant={statusColors[p.status || "active"] as any}>{p.status}</Badge>,
    },
    {
      key: "actions", label: "",
      render: (p: Person) => (
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(p); setDialogOpen(true); }} data-testid={`button-edit-${p.id}`}>
          <Pencil className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="People"
        description="Manage employees, contractors, and personnel"
        action={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} data-testid="button-add-person">
            <Plus className="w-4 h-4 mr-1" /> Add Person
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={people}
        isLoading={isLoading}
        searchable
        searchKeys={["firstName", "lastName", "email", "employeeId"]}
        emptyMessage="No people registered yet"
      />
      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        title={editing ? "Edit Person" : "Add Person"}
        fields={fields}
        initialData={editing ? { ...editing, departmentId: editing.departmentId ? String(editing.departmentId) : "", designationId: editing.designationId ? String(editing.designationId) : "", companyId: editing.companyId ? String(editing.companyId) : "", categoryId: editing.categoryId ? String(editing.categoryId) : "", siteId: editing.siteId ? String(editing.siteId) : "", riskTier: editing.riskTier ?? 1 } : undefined}
        onSubmit={(data) => {
          if (data.departmentId) data.departmentId = Number(data.departmentId);
          if (data.designationId) data.designationId = Number(data.designationId);
          if (data.companyId) data.companyId = Number(data.companyId);
          if (data.categoryId) data.categoryId = Number(data.categoryId);
          if (data.siteId) data.siteId = Number(data.siteId);
          editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data);
        }}
        isPending={createMut.isPending || updateMut.isPending}
      />
    </div>
  );
}
