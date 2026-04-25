import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  AlertCircle,
  Wrench,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import type { Device, Site, Zone } from "@shared/schema";
import { formatDateTime } from "@/lib/utils";

const statusConfig: Record<
  string,
  { color: string; icon: typeof Wifi; dotClass: string }
> = {
  online: { color: "default", icon: Wifi, dotClass: "bg-green-500" },
  offline: { color: "secondary", icon: WifiOff, dotClass: "bg-slate-400" },
  error: { color: "destructive", icon: AlertCircle, dotClass: "bg-red-500" },
  maintenance: { color: "outline", icon: Wrench, dotClass: "bg-orange-500" },
};

export default function DevicesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);

  // Aapka original CRUD hook
  const {
    data = [],
    isLoading,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    refetch,
  } = useCrud<Device>("/api/devices", "Device");
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ["/api/zones"] });

  const online = data.filter((d) => d.status === "online").length;
  const offline = data.filter((d) => d.status === "offline").length;
  const errored = data.filter((d) => d.status === "error").length;

  const fields: FieldConfig[] = [
    { key: "name", label: "Device Name", required: true },
    {
      key: "activationCode",
      label: "Activation Code",
      readOnly: !!editing,
    } as any,
    {
      key: "deviceType",
      label: "Type",
      type: "select",
      options: [
        { value: "reader", label: "Reader" },
        { value: "turnstile", label: "Turnstile" },
        { value: "gate", label: "Gate" },
        { value: "barrier", label: "Barrier" },
        { value: "controller", label: "Controller" },
        { value: "biometric", label: "Biometric" },
      ],
      defaultValue: "reader",
    },
    // {
    //   key: "locationId",
    //   label: "Site",
    //   type: "select",
    //   options: sites.map((s) => ({ value: String(s.id), label: s.name })),
    // },
    // {
    //   key: "zoneId",
    //   label: "Zone",
    //   type: "select",
    //   options: zones.map((z) => ({ value: String(z.id), label: z.name })),
    // },
    { key: "ipAddress", label: "IP Address" },
    { key: "macAddress", label: "MAC Address" },
    { key: "serialNumber", label: "Serial Number" },
    { key: "firmwareVersion", label: "Firmware Version" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
        { value: "error", label: "Error" },
        { value: "maintenance", label: "Maintenance" },
      ],
      defaultValue: "offline",
    },
    { key: "isActive", label: "Active", type: "switch", defaultValue: true },
  ];

  const columns = [
    {
      key: "name",
      label: "Device",
      render: (d: Device) => (
        <div>
          <span className="font-medium">{d.name}</span>
          {d.ipAddress && (
            <p className="text-xs text-muted-foreground font-mono">
              {d.ipAddress}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "deviceType",
      label: "Type",
      render: (d: Device) => <Badge variant="secondary">{d.deviceType}</Badge>,
    },

    // YEH RAH AAPKA SITE COLUMN
    // {
    //   key: "site",
    //   label: "Site",
    //   hideOnMobile: true,
    //   render: (d: Device) =>
    //     sites.find((s) => s.id === d.locationId)?.name || "-",
    // },

    // STATUS COLUMN
    {
      key: "status",
      label: "Status",
      render: (d: Device) => {
        // Frontend calculation ko hata kar seedha backend ka status use karein
        const statusKey = (d.status || "offline").toLowerCase();
        const cfg = statusConfig[statusKey] || statusConfig.offline;

        return (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {statusKey === "online" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dotClass}`}></span>
            </span>
            <Badge variant={cfg.color as any}>{statusKey}</Badge>
          </div>
        );
      },
    },

    // LAST SEEN COLUMN
    {
      key: "lastHeartbeat",
      label: "Last Seen",
      hideOnMobile: true,
      render: (d: Device) => {
        if (!d.lastHeartbeat) return "Never";

        // Yahan manual calculation ke bajaye seedha formatted time dikhayein
        // Kyunki manual diff nikalne mein hi timezone ki galti hoti hai
        return (
          <div className="flex flex-col leading-tight">
            <span className={`text-sm font-medium ${d.status === 'online' ? 'text-green-600' : 'text-slate-500'}`}>
              {d.status === 'online' ? 'Active' : 'Last seen'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {/* Aapki existing utils function use kar raha hoon */}
              {formatDateTime(d.lastHeartbeat)}
            </span>
          </div>
        );
      },
    },

    // ACTIONS COLUMN (Yahan "Actions" header add kiya hai)
    {
      key: "actions",
      label: "Actions",
      render: (d: Device) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(d);
              setDialogOpen(true);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const idToDelete = d.id || (d as any).msId;
              if (
                idToDelete &&
                window.confirm("Are you sure you want to delete this device?")
              ) {
                remove(idToDelete);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Devices"
        description="Manage access control devices"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              refetch(); // <--- Sirf ye call karna hai data fresh karne ke liye
            }}
            className="gap-2"
            disabled={isLoading} // Optional: Fetching ke waqt double click rokne ke liye
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : "transition-transform group-hover:rotate-180"}`}
            />
            {isLoading ? "Syncing..." : "Sync"}
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-3"> {/* 2 se badha kar 4 kiya */}
        <Card>
          <CardContent className="p-2 text-center"> {/* Padding bhi p-3 se p-2 kar di */}
            <p className="text-xl font-bold text-green-600">{online}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Online</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-xl font-bold text-muted-foreground">{offline}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Offline</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        searchKeys={["name", "ipAddress", "serialNumber"]}
        emptyMessage="No devices registered"
      />

      <CrudDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Device" : "Add Device"}
        fields={fields}
        initialData={
          editing
            ? {
              ...editing,
              locationId: editing.locationId
                ? String(editing.locationId)
                : "",
              zoneId: editing.zoneId ? String(editing.zoneId) : "",
            }
            : undefined
        }
        onSubmit={(formData) => {
          if (formData.locationId)
            formData.locationId = Number(formData.locationId);
          if (formData.zoneId) formData.zoneId = Number(formData.zoneId);
          if (editing) {
            const updateId = editing.id || (editing as any).msId;
            update({ id: updateId, data: formData });
          } else {
            create(formData);
          }
          setDialogOpen(false);
          setEditing(null);
        }}
        isPending={isCreating || isUpdating}
      />
    </div>
  );
}