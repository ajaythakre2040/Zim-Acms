import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogIn, LogOut, Pencil } from "lucide-react";
import type { Visitor, Visit, Person, Site } from "@shared/schema";

export default function VisitorsPage() {
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [visitDialog, setVisitDialog] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const { toast } = useToast();

  const { data: visitors = [], isLoading: loadingVisitors } = useQuery<Visitor[]>({ queryKey: ["/api/visitors"] });
  const { data: visits = [], isLoading: loadingVisits } = useQuery<Visit[]>({ queryKey: ["/api/visits"] });
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  const createVisitor = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/visitors", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/visitors"] }); setVisitorDialog(false); toast({ title: "Visitor registered" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateVisitor = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const r = await apiRequest("PUT", `/api/visitors/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/visitors"] }); setVisitorDialog(false); setEditingVisitor(null); toast({ title: "Visitor updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createVisit = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/visits", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/visits"] }); setVisitDialog(false); toast({ title: "Visit scheduled" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkInMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiRequest("POST", `/api/visits/${id}/check-in`); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/visits"] }); toast({ title: "Visitor checked in" }); },
  });

  const checkOutMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiRequest("POST", `/api/visits/${id}/check-out`); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/visits"] }); toast({ title: "Visitor checked out" }); },
  });

  const visitorFields: FieldConfig[] = [
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company" },
    { key: "idProofType", label: "ID Proof Type", type: "select", options: [{ value: "passport", label: "Passport" }, { value: "license", label: "License" }, { value: "national_id", label: "National ID" }, { value: "other", label: "Other" }] },
    { key: "idProofNumber", label: "ID Proof Number" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "isBlacklisted", label: "Blacklisted", type: "switch" },
    { key: "blacklistReason", label: "Blacklist Reason" },
  ];

  const visitFields: FieldConfig[] = [
    { key: "visitorId", label: "Visitor", type: "select", required: true, options: visitors.map((v) => ({ value: String(v.id), label: `${v.firstName} ${v.lastName || ""}` })) },
    { key: "hostPersonId", label: "Host", type: "select", options: people.map((p) => ({ value: String(p.id), label: `${p.firstName} ${p.lastName || ""}` })) },
    { key: "siteId", label: "Site", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "purpose", label: "Purpose" },
    { key: "badgeNumber", label: "Badge Number" },
  ];

  const visitStatusColors: Record<string, string> = {
    scheduled: "secondary",
    checked_in: "default",
    checked_out: "outline",
    cancelled: "destructive",
    no_show: "destructive",
  };

  const visitorColumns = [
    { key: "name", label: "Name", render: (v: Visitor) => <span className="font-medium">{v.firstName} {v.lastName || ""}</span> },
    { key: "phone", label: "Phone", hideOnMobile: true },
    { key: "company", label: "Company", hideOnMobile: true },
    { key: "isBlacklisted", label: "Status", render: (v: Visitor) => v.isBlacklisted ? <Badge variant="destructive">Blacklisted</Badge> : <Badge variant="secondary">Clear</Badge> },
    { key: "actions", label: "", render: (v: Visitor) => (
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingVisitor(v); setVisitorDialog(true); }} data-testid={`button-edit-visitor-${v.id}`}>
        <Pencil className="w-4 h-4" />
      </Button>
    )},
  ];

  const visitColumns = [
    { key: "visitor", label: "Visitor", render: (v: Visit) => { const vis = visitors.find((x) => x.id === v.visitorId); return vis ? `${vis.firstName} ${vis.lastName || ""}` : "-"; }},
    { key: "host", label: "Host", hideOnMobile: true, render: (v: Visit) => { const h = people.find((x) => x.id === v.hostPersonId); return h ? `${h.firstName} ${h.lastName || ""}` : "-"; }},
    { key: "purpose", label: "Purpose", hideOnMobile: true },
    { key: "status", label: "Status", render: (v: Visit) => <Badge variant={visitStatusColors[v.status || ""] as any}>{(v.status || "").replace("_", " ")}</Badge> },
    { key: "actions", label: "", render: (v: Visit) => (
      <div className="flex gap-1">
        {v.status === "scheduled" && (
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); checkInMut.mutate(v.id); }} data-testid={`button-checkin-${v.id}`}>
            <LogIn className="w-4 h-4" />
          </Button>
        )}
        {v.status === "checked_in" && (
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); checkOutMut.mutate(v.id); }} data-testid={`button-checkout-${v.id}`}>
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Visitor Management" description="Register visitors and manage visits" />
      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visits" data-testid="tab-visits">Visits</TabsTrigger>
          <TabsTrigger value="visitors" data-testid="tab-visitors">Visitor Registry</TabsTrigger>
        </TabsList>
        <TabsContent value="visits">
          <div className="mb-4">
            <Button onClick={() => setVisitDialog(true)} data-testid="button-schedule-visit">
              <Plus className="w-4 h-4 mr-1" /> Schedule Visit
            </Button>
          </div>
          <DataTable columns={visitColumns} data={visits} isLoading={loadingVisits} searchable searchKeys={["purpose"]} emptyMessage="No visits scheduled" />
        </TabsContent>
        <TabsContent value="visitors">
          <div className="mb-4">
            <Button onClick={() => { setEditingVisitor(null); setVisitorDialog(true); }} data-testid="button-add-visitor">
              <Plus className="w-4 h-4 mr-1" /> Register Visitor
            </Button>
          </div>
          <DataTable columns={visitorColumns} data={visitors} isLoading={loadingVisitors} searchable searchKeys={["firstName", "lastName", "phone", "company"]} emptyMessage="No visitors registered" />
        </TabsContent>
      </Tabs>

      <CrudDialog
        open={visitorDialog}
        onClose={() => { setVisitorDialog(false); setEditingVisitor(null); }}
        title={editingVisitor ? "Edit Visitor" : "Register Visitor"}
        fields={visitorFields}
        initialData={editingVisitor || undefined}
        onSubmit={(data) => editingVisitor ? updateVisitor.mutate({ id: editingVisitor.id, data }) : createVisitor.mutate(data)}
        isPending={createVisitor.isPending || updateVisitor.isPending}
      />
      <CrudDialog
        open={visitDialog}
        onClose={() => setVisitDialog(false)}
        title="Schedule Visit"
        fields={visitFields}
        onSubmit={(data) => {
          if (data.visitorId) data.visitorId = Number(data.visitorId);
          if (data.hostPersonId) data.hostPersonId = Number(data.hostPersonId);
          if (data.siteId) data.siteId = Number(data.siteId);
          createVisit.mutate(data);
        }}
        isPending={createVisit.isPending}
      />
    </div>
  );
}
