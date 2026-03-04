import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X } from "lucide-react";
import type { Exception, Person } from "@shared/schema";

const statusColors: Record<string, string> = { pending: "secondary", approved: "default", rejected: "destructive" };
const typeLabels: Record<string, string> = { missing_punch: "Missing Punch", device_down: "Device Down", manual_correction: "Manual Correction", regularization: "Regularization", leave: "Leave", wfh: "WFH", on_duty: "On Duty" };

export default function ExceptionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: exceptions = [], isLoading } = useQuery<Exception[]>({ queryKey: ["/api/exceptions"] });
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/exceptions", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/exceptions"] }); setDialogOpen(false); toast({ title: "Exception created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiRequest("PUT", `/api/exceptions/${id}/approve`); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/exceptions"] }); toast({ title: "Exception approved" }); },
  });

  const rejectMut = useMutation({
    mutationFn: async (id: number) => { const r = await apiRequest("PUT", `/api/exceptions/${id}/reject`, { reason: "Rejected" }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/exceptions"] }); toast({ title: "Exception rejected" }); },
  });

  const fields: FieldConfig[] = [
    { key: "personId", label: "Person", type: "select", required: true, options: people.map((p) => ({ value: String(p.id), label: `${p.firstName} ${p.lastName || ""}` })) },
    { key: "exceptionType", label: "Type", type: "select", required: true, options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "reason", label: "Reason", type: "textarea" },
  ];

  const columns = [
    { key: "person", label: "Person", render: (e: Exception) => { const p = people.find((x) => x.id === e.personId); return p ? `${p.firstName} ${p.lastName || ""}` : `#${e.personId}`; }},
    { key: "exceptionType", label: "Type", render: (e: Exception) => <Badge variant="secondary">{typeLabels[e.exceptionType] || e.exceptionType}</Badge> },
    { key: "date", label: "Date" },
    { key: "reason", label: "Reason", hideOnMobile: true, render: (e: Exception) => <span className="truncate max-w-[200px] block">{e.reason || "-"}</span> },
    { key: "approvalStatus", label: "Status", render: (e: Exception) => <Badge variant={statusColors[e.approvalStatus || ""] as any}>{e.approvalStatus}</Badge> },
    { key: "actions", label: "", render: (e: Exception) => e.approvalStatus === "pending" ? (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); approveMut.mutate(e.id); }} data-testid={`button-approve-${e.id}`}><Check className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); rejectMut.mutate(e.id); }} data-testid={`button-reject-${e.id}`}><X className="w-4 h-4" /></Button>
      </div>
    ) : null },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Exceptions" description="Manage attendance exceptions and corrections" action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Raise Exception</Button>} />
      <DataTable columns={columns} data={exceptions} isLoading={isLoading} searchable searchKeys={["exceptionType", "date"]} emptyMessage="No exceptions raised" />
      <CrudDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Raise Exception" fields={fields}
        onSubmit={(data) => { data.personId = Number(data.personId); createMut.mutate(data); }} isPending={createMut.isPending} />
    </div>
  );
}
