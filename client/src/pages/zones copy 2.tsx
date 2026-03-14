import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  MonitorSmartphone,
  X,
  Settings2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Zone, Door, Site } from "@shared/schema";

export default function ZonesDoorsPage() {
  const [zoneDialog, setZoneDialog] = useState(false);
  const [doorDialog, setDoorDialog] = useState(false);
  const [mappingDialog, setMappingDialog] = useState(false);

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingDoor, setEditingDoor] = useState<Door | null>(null);
  const [selectedDoorForMapping, setSelectedDoorForMapping] = useState<Door | null>(null);

  const zoneCrud = useCrud<Zone>("/api/zones", "Zone");
  const doorCrud = useCrud<Door>("/api/doors", "Door");
  const mappingCrud = useCrud<any>("/api/door-devices", "Device Mapping");

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: devices = [] } = useQuery<any[]>({ queryKey: ["/api/devices"] });

  const handleMappingUpdate = async (deviceId: number, direction: 'in' | 'out') => {
    if (!selectedDoorForMapping || isNaN(deviceId)) return;

    const existing = mappingCrud.data.find((m: any) => m.doorId === selectedDoorForMapping.id);
    const inIds = Array.isArray(existing?.inDeviceIds) ? existing.inDeviceIds : [];
    const outIds = Array.isArray(existing?.outDeviceIds) ? existing.outDeviceIds : [];

    if (direction === 'in' && inIds.includes(deviceId)) return;
    if (direction === 'out' && outIds.includes(deviceId)) return;

    const payload = {
      doorId: selectedDoorForMapping.id,
      inDeviceIds: direction === 'in' ? [...inIds, deviceId] : inIds,
      outDeviceIds: direction === 'out' ? [...outIds, deviceId] : outIds,
    };

    if (existing) {
      await mappingCrud.update({ id: existing.id, data: payload });
    } else {
      await mappingCrud.create(payload);
    }
  };

  const removeDevice = async (deviceId: number, direction: 'in' | 'out', mapping: any) => {
    const payload = {
      ...mapping,
      inDeviceIds: direction === 'in' ? mapping.inDeviceIds.filter((id: number) => id !== deviceId) : mapping.inDeviceIds,
      outDeviceIds: direction === 'out' ? mapping.outDeviceIds.filter((id: number) => id !== deviceId) : mapping.outDeviceIds,
    };
    await mappingCrud.update({ id: mapping.id, data: payload });
  };

  const zoneFields: FieldConfig[] = [
    { key: "name", label: "Zone Name", required: true },
    { key: "code", label: "Code" },
    { key: "locationId", label: "Site", type: "select", required: true, options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "securityLevel", label: "Security Level (1-5)", type: "number", defaultValue: 1 },
    { key: "isHighRisk", label: "High Risk Zone", type: "switch" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const doorFields: FieldConfig[] = [
    { key: "name", label: "Door Name", required: true },
    { key: "code", label: "Code" },
    { key: "locationId", label: "Site", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: "zoneId", label: "Zone", type: "select", options: zoneCrud.data.map((z) => ({ value: String(z.id), label: z.name })) },
    { key: "doorType", label: "Type", type: "select", options: [{ value: "standard", label: "Standard" }, { value: "turnstile", label: "Turnstile" }, { value: "barrier", label: "Barrier" }, { value: "gate", label: "Gate" }, { value: "emergency", label: "Emergency" }], defaultValue: "standard" },
    { key: "requires2FA", label: "Requires 2FA", type: "switch" },
    { key: "isHighRisk", label: "High Risk", type: "switch" },
    { key: "status", label: "Status", type: "select", options: [{ value: "normal", label: "Normal" }, { value: "locked", label: "Locked" }, { value: "unlocked", label: "Unlocked" }, { value: "alarm", label: "Alarm" }, { value: "maintenance", label: "Maintenance" }], defaultValue: "normal" },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const secLevelColors = ["", "default", "secondary", "secondary", "destructive", "destructive"];
  const doorStatusColors: Record<string, string> = { normal: "default", locked: "secondary", unlocked: "outline", alarm: "destructive", maintenance: "secondary" };

  const zoneColumns = [
    { key: "name", label: "Zone", render: (z: Zone) => <span className="font-medium">{z.name}</span> },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "site", label: "Site", hideOnMobile: true, render: (z: Zone) => sites.find((s) => s.id === z.locationId)?.name || "-" },
    { key: "securityLevel", label: "Level", render: (z: Zone) => <Badge variant={secLevelColors[z.securityLevel || 1] as any}>L{z.securityLevel}</Badge> },
    {
      key: "actions", label: "", render: (z: Zone) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => { setEditingZone(z); setZoneDialog(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => zoneCrud.remove(z.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    },
  ];

  const doorColumns = [
    {
      key: "name", label: "Door", render: (d: Door) => (
        <div className="flex flex-col">
          <span className="font-medium">{d.name}</span>
          <div className="flex gap-1 mt-1">
            {mappingCrud.data.filter((m: any) => m.doorId === d.id).map((m: any) => (
              <div key={m.id} className="flex gap-1">
                {m.inDeviceIds?.length > 0 && <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">IN: {m.inDeviceIds.length}</Badge>}
                {m.outDeviceIds?.length > 0 && <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">OUT: {m.outDeviceIds.length}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )
    },
    { key: "code", label: "Code", hideOnMobile: true },
    { key: "doorType", label: "Type", render: (d: Door) => <Badge variant="secondary" className="capitalize">{d.doorType}</Badge> },
    { key: "zone", label: "Zone", hideOnMobile: true, render: (d: Door) => zoneCrud.data.find((z) => z.id === d.zoneId)?.name || "-" },
    { key: "status", label: "Status", render: (d: Door) => <Badge variant={doorStatusColors[d.status || ""] as any}>{d.status}</Badge> },
    {
      key: "actions",
      label: "",
      render: (d: Door) => (
        <div className="flex gap-1 justify-end">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setSelectedDoorForMapping(d); setMappingDialog(true); }}>
                  <MonitorSmartphone className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assign Hardware</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingDoor(d); setDoorDialog(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Door</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); doorCrud.remove(d.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Door</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
  ];

  const currentMapping = mappingCrud.data.find((m: any) => m.doorId === selectedDoorForMapping?.id);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Zones & Doors" description="Manage security zones and access points" />

      <Tabs defaultValue="zones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="doors">Doors</TabsTrigger>
        </TabsList>
        <TabsContent value="zones">
          <div className="mb-4 text-right md:text-left">
            <Button onClick={() => { setEditingZone(null); setZoneDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Zone
            </Button>
          </div>
          <DataTable columns={zoneColumns} data={zoneCrud.data} isLoading={zoneCrud.isLoading} searchable searchKeys={["name", "code"]} />
        </TabsContent>
        <TabsContent value="doors">
          <div className="mb-4 text-right md:text-left">
            <Button onClick={() => { setEditingDoor(null); setDoorDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Door
            </Button>
          </div>
          <DataTable columns={doorColumns} data={doorCrud.data} isLoading={doorCrud.isLoading} searchable searchKeys={["name", "code"]} />
        </TabsContent>
      </Tabs>

      <CrudDialog open={zoneDialog} onClose={() => { setZoneDialog(false); setEditingZone(null); }} title={editingZone ? "Edit Zone" : "Add Zone"} fields={zoneFields} initialData={editingZone ? { ...editingZone, locationId: String(editingZone.locationId) } : undefined} onSubmit={(data) => { data.locationId = Number(data.locationId); editingZone ? zoneCrud.update({ id: editingZone.id, data }) : zoneCrud.create(data); setZoneDialog(false); }} isPending={zoneCrud.isCreating || zoneCrud.isUpdating} />

      <CrudDialog open={doorDialog} onClose={() => { setDoorDialog(false); setEditingDoor(null); }} title={editingDoor ? "Edit Door" : "Add Door"} fields={doorFields} initialData={editingDoor ? { ...editingDoor, locationId: editingDoor.locationId ? String(editingDoor.locationId) : "", zoneId: editingDoor.zoneId ? String(editingDoor.zoneId) : "" } : undefined} onSubmit={(data) => { if (data.locationId) data.locationId = Number(data.locationId); if (data.zoneId) data.zoneId = Number(data.zoneId); editingDoor ? doorCrud.update({ id: editingDoor.id, data }) : doorCrud.create(data); setDoorDialog(false); }} isPending={doorCrud.isCreating || doorCrud.isUpdating} />

      <Dialog open={mappingDialog} onOpenChange={setMappingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings2 className="w-5 h-5 text-primary" />
              Hardware: {selectedDoorForMapping?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* IN Section */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-blue-600 flex justify-between">
                <span>Entry (IN) Devices</span>
                <span className="text-[10px] font-normal text-muted-foreground uppercase">Select to add</span>
              </label>
              <Select value="" onValueChange={(val) => handleMappingUpdate(Number(val), 'in')}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Click to add device..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map(d => (
                    <SelectItem key={d.id} value={String(d.id)} disabled={currentMapping?.inDeviceIds?.includes(d.id)}>
                      {d.name} {d.ipAddress ? `(${d.ipAddress})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {currentMapping?.inDeviceIds?.map((id: number) => {
                  const dev = devices.find(d => d.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="pl-3 pr-1.5 py-1.5 gap-2 bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors">
                      {dev?.name || `ID: ${id}`}
                      <X className="w-3.5 h-3.5 cursor-pointer text-blue-400 hover:text-destructive" onClick={() => removeDevice(id, 'in', currentMapping)} />
                    </Badge>
                  );
                })}
              </div>
            </div>

            <hr className="border-dashed border-slate-200" />

            {/* OUT Section */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-green-600 flex justify-between">
                <span>Exit (OUT) Devices</span>
                <span className="text-[10px] font-normal text-muted-foreground uppercase">Select to add</span>
              </label>
              <Select value="" onValueChange={(val) => handleMappingUpdate(Number(val), 'out')}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Click to add device..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map(d => (
                    <SelectItem key={d.id} value={String(d.id)} disabled={currentMapping?.outDeviceIds?.includes(d.id)}>
                      {d.name} {d.ipAddress ? `(${d.ipAddress})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {currentMapping?.outDeviceIds?.map((id: number) => {
                  const dev = devices.find(d => d.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="pl-3 pr-1.5 py-1.5 gap-2 bg-green-50 border-green-100 text-green-700 hover:bg-green-100 transition-colors">
                      {dev?.name || `ID: ${id}`}
                      <X className="w-3.5 h-3.5 cursor-pointer text-green-400 hover:text-destructive" onClick={() => removeDevice(id, 'out', currentMapping)} />
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button className="w-full shadow-md" onClick={() => setMappingDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}