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
import { Plus, Eye, CheckCircle } from "lucide-react";
import type { Alert } from "@shared/schema";

const severityColors: Record<string, string> = { low: "secondary", medium: "outline", high: "destructive", critical: "destructive" };
const typeLabels: Record<string, string> = { security: "Security", device: "Device", system: "System", visitor: "Visitor", attendance: "Attendance" };

export default function AlertsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("active");
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: [`/api/alerts?resolved=${tab === "resolved"}`],
  });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/alerts", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/alerts") }); setDialogOpen(false); toast({ title: "Alert created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const ackMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiRequest("PUT", `/api/alerts/${id}/acknowledge`); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/alerts") }); toast({ title: "Alert acknowledged" }); },
  });

  const resolveMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiRequest("PUT", `/api/alerts/${id}/resolve`); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/alerts") }); toast({ title: "Alert resolved" }); },
  });

  const fields: FieldConfig[] = [
    { key: "alertType", label: "Type", type: "select", required: true, options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
    { key: "severity", label: "Severity", type: "select", options: [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }], defaultValue: "medium" },
    { key: "title", label: "Title", required: true },
    { key: "message", label: "Message", type: "textarea" },
  ];

  const columns = [
    { key: "title", label: "Alert", render: (a: Alert) => (
      <div>
        <p className="font-medium">{a.title}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{a.message}</p>
      </div>
    )},
    { key: "alertType", label: "Type", render: (a: Alert) => <Badge variant="secondary">{typeLabels[a.alertType] || a.alertType}</Badge> },
    { key: "severity", label: "Severity", render: (a: Alert) => <Badge variant={severityColors[a.severity || ""] as any}>{a.severity}</Badge> },
    { key: "createdAt", label: "Time", hideOnMobile: true, render: (a: Alert) => a.createdAt ? new Date(a.createdAt).toLocaleString() : "-" },
    { key: "actions", label: "", render: (a: Alert) => !a.isResolved ? (
      <div className="flex gap-1">
        {!a.isRead && <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); ackMut.mutate(a.id); }} data-testid={`button-ack-${a.id}`}><Eye className="w-4 h-4" /></Button>}
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); resolveMut.mutate(a.id); }} data-testid={`button-resolve-${a.id}`}><CheckCircle className="w-4 h-4" /></Button>
      </div>
    ) : <Badge variant="secondary">Resolved</Badge> },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Alerts" description="Security and system alerts" action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Create Alert</Button>} />
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <DataTable columns={columns} data={alerts} isLoading={isLoading} searchable searchKeys={["title", "alertType"]} emptyMessage={`No ${tab} alerts`} />
        </TabsContent>
      </Tabs>
      <CrudDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create Alert" fields={fields}
        onSubmit={(data) => createMut.mutate(data)} isPending={createMut.isPending} />
    </div>
  );
}
