import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Wifi, WifiOff, AlertCircle, Wrench } from "lucide-react";
import type { Device, Site, Zone } from "@shared/schema";

const statusConfig: Record<string, { color: string; icon: typeof Wifi }> = {
  online: { color: "default", icon: Wifi },
  offline: { color: "secondary", icon: WifiOff },
  error: { color: "destructive", icon: AlertCircle },
  maintenance: { color: "outline", icon: Wrench },
};

export default function DevicesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<Device>("/api/devices", "Device");
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ["/api/zones"] });

  const online = data.filter((d) => d.status === "online").length;
  const offline = data.filter((d) => d.status === "offline").length;
  const errored = data.filter((d) => d.status === "error").length;

  const fields: FieldConfig[] = [
    { key: "name", label: "Device Name", required: true },
    { key: "code", label: "Code" },
    { key: "deviceType", label: "Type", type: "select", options: [{ value: "reader", label: "Reader" }, { value: "turnstile", label: "Turnstile" }, { value: "gate", label: "Gate" }, { value: "barrier", label: "Barrier" }, { value: "controller", label: "Controller" }, { value: "biometric", label: "Biometric" }], defaultValue: "reader" },
    { key: "siteId", label: "Site", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "zoneId", label: "Zone", type: "select", options: zones.map((z) => ({ value: String(z.id), label: z.name })) },
    { key: "ipAddress", label: "IP Address" },
    { key: "macAddress", label: "MAC Address" },
    { key: "serialNumber", label: "Serial Number" },
    { key: "firmwareVersion", label: "Firmware Version" },
    { key: "status", label: "Status", type: "select", options: [{ value: "online", label: "Online" }, { value: "offline", label: "Offline" }, { value: "error", label: "Error" }, { value: "maintenance", label: "Maintenance" }], defaultValue: "offline" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const columns = [
    { key: "name", label: "Device", render: (d: Device) => (
      <div>
        <span className="font-medium">{d.name}</span>
        {d.ipAddress && <p className="text-xs text-muted-foreground font-mono">{d.ipAddress}</p>}
      </div>
    )},
    { key: "deviceType", label: "Type", render: (d: Device) => <Badge variant="secondary">{d.deviceType}</Badge> },
    { key: "site", label: "Site", hideOnMobile: true, render: (d: Device) => sites.find((s) => s.id === d.siteId)?.name || "-" },
    { key: "status", label: "Status", render: (d: Device) => {
      const cfg = statusConfig[d.status || "offline"];
      return <Badge variant={cfg.color as any}>{d.status}</Badge>;
    }},
    { key: "lastHeartbeat", label: "Last Seen", hideOnMobile: true, render: (d: Device) => d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : "Never" },
    { key: "actions", label: "", render: (d: Device) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(d); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(d.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader title="Devices" description="Manage access control devices" action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Device</Button>} />
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600 dark:text-green-400">{online}</p><p className="text-xs text-muted-foreground">Online</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-muted-foreground">{offline}</p><p className="text-xs text-muted-foreground">Offline</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-red-600 dark:text-red-400">{errored}</p><p className="text-xs text-muted-foreground">Error</p></CardContent></Card>
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} searchable searchKeys={["name", "code", "ipAddress", "serialNumber"]} emptyMessage="No devices registered" />
      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} title={editing ? "Edit Device" : "Add Device"} fields={fields}
        initialData={editing ? { ...editing, siteId: editing.siteId ? String(editing.siteId) : "", zoneId: editing.zoneId ? String(editing.zoneId) : "" } : undefined}
        onSubmit={(data) => { if (data.siteId) data.siteId = Number(data.siteId); if (data.zoneId) data.zoneId = Number(data.zoneId); editing ? update({ id: editing.id, data }) : create(data); setDialogOpen(false); setEditing(null); }} isPending={isCreating || isUpdating} />
    </div>
  );
}
