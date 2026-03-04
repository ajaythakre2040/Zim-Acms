import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Zone, Door, Site } from "@shared/schema";

export default function ZonesDoorsPage() {
  const [zoneDialog, setZoneDialog] = useState(false);
  const [doorDialog, setDoorDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingDoor, setEditingDoor] = useState<Door | null>(null);

  const zoneCrud = useCrud<Zone>("/api/zones", "Zone");
  const doorCrud = useCrud<Door>("/api/doors", "Door");
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  const zoneFields: FieldConfig[] = [
    { key: "name", label: "Zone Name", required: true },
    { key: "code", label: "Code" },
    { key: "siteId", label: "Site", type: "select", required: true, options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "securityLevel", label: "Security Level (1-5)", type: "number", defaultValue: 1 },
    { key: "isHighRisk", label: "High Risk Zone", type: "switch" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const doorFields: FieldConfig[] = [
    { key: "name", label: "Door Name", required: true },
    { key: "code", label: "Code" },
    { key: "siteId", label: "Site", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "zoneId", label: "Zone", type: "select", options: zoneCrud.data.map((z) => ({ value: String(z.id), label: z.name })) },
    { key: "doorType", label: "Type", type: "select", options: [{ value: "standard", label: "Standard" }, { value: "turnstile", label: "Turnstile" }, { value: "barrier", label: "Barrier" }, { value: "gate", label: "Gate" }, { value: "emergency", label: "Emergency" }], defaultValue: "standard" },
    { key: "requires2FA", label: "Requires 2FA", type: "switch" },
    { key: "isHighRisk", label: "High Risk", type: "switch" },
    { key: "status", label: "Status", type: "select", options: [{ value: "normal", label: "Normal" }, { value: "locked", label: "Locked" }, { value: "unlocked", label: "Unlocked" }, { value: "alarm", label: "Alarm" }, { value: "maintenance", label: "Maintenance" }], defaultValue: "normal" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const secLevelColors = ["", "default", "secondary", "secondary", "destructive", "destructive"];

  const zoneColumns = [
    { key: "name", label: "Zone", render: (z: Zone) => <span className="font-medium">{z.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "site", label: "Site", hideOnMobile: true, render: (z: Zone) => sites.find((s) => s.id === z.siteId)?.name || "-" },
    { key: "securityLevel", label: "Level", render: (z: Zone) => <Badge variant={secLevelColors[z.securityLevel || 1] as any}>L{z.securityLevel}</Badge> },
    { key: "isHighRisk", label: "Risk", render: (z: Zone) => z.isHighRisk ? <Badge variant="destructive">High Risk</Badge> : null },
    { key: "actions", label: "", render: (z: Zone) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingZone(z); setZoneDialog(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); zoneCrud.remove(z.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  const doorStatusColors: Record<string, string> = { normal: "default", locked: "secondary", unlocked: "outline", alarm: "destructive", maintenance: "secondary" };

  const doorColumns = [
    { key: "name", label: "Door", render: (d: Door) => <span className="font-medium">{d.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "doorType", label: "Type", render: (d: Door) => <Badge variant="secondary">{d.doorType}</Badge> },
    { key: "zone", label: "Zone", hideOnMobile: true, render: (d: Door) => zoneCrud.data.find((z) => z.id === d.zoneId)?.name || "-" },
    { key: "status", label: "Status", render: (d: Door) => <Badge variant={doorStatusColors[d.status || ""] as any}>{d.status}</Badge> },
    { key: "actions", label: "", render: (d: Door) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingDoor(d); setDoorDialog(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); doorCrud.remove(d.id); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Zones & Doors" description="Manage security zones and access points" />
      <Tabs defaultValue="zones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="doors">Doors</TabsTrigger>
        </TabsList>
        <TabsContent value="zones">
          <div className="mb-4"><Button onClick={() => { setEditingZone(null); setZoneDialog(true); }}><Plus className="w-4 h-4 mr-1" /> Add Zone</Button></div>
          <DataTable columns={zoneColumns} data={zoneCrud.data} isLoading={zoneCrud.isLoading} searchable searchKeys={["name", "code"]} />
        </TabsContent>
        <TabsContent value="doors">
          <div className="mb-4"><Button onClick={() => { setEditingDoor(null); setDoorDialog(true); }}><Plus className="w-4 h-4 mr-1" /> Add Door</Button></div>
          <DataTable columns={doorColumns} data={doorCrud.data} isLoading={doorCrud.isLoading} searchable searchKeys={["name", "code"]} />
        </TabsContent>
      </Tabs>
      <CrudDialog open={zoneDialog} onClose={() => { setZoneDialog(false); setEditingZone(null); }} title={editingZone ? "Edit Zone" : "Add Zone"} fields={zoneFields}
        initialData={editingZone ? { ...editingZone, siteId: String(editingZone.siteId) } : undefined}
        onSubmit={(data) => { data.siteId = Number(data.siteId); editingZone ? zoneCrud.update({ id: editingZone.id, data }) : zoneCrud.create(data); setZoneDialog(false); setEditingZone(null); }} isPending={zoneCrud.isCreating || zoneCrud.isUpdating} />
      <CrudDialog open={doorDialog} onClose={() => { setDoorDialog(false); setEditingDoor(null); }} title={editingDoor ? "Edit Door" : "Add Door"} fields={doorFields}
        initialData={editingDoor ? { ...editingDoor, siteId: editingDoor.siteId ? String(editingDoor.siteId) : "", zoneId: editingDoor.zoneId ? String(editingDoor.zoneId) : "" } : undefined}
        onSubmit={(data) => { if (data.siteId) data.siteId = Number(data.siteId); if (data.zoneId) data.zoneId = Number(data.zoneId); editingDoor ? doorCrud.update({ id: editingDoor.id, data }) : doorCrud.create(data); setDoorDialog(false); setEditingDoor(null); }} isPending={doorCrud.isCreating || doorCrud.isUpdating} />
    </div>
  );
}
