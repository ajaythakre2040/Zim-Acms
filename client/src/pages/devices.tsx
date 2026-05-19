import { useState, useEffect  } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { validateNoHtml } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";
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
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
} from "lucide-react";
import type { Device, Site, Zone } from "@shared/schema";
import { formatDateTime } from "@/lib/utils";
import { MENU_CONFIG } from "../../../server/constant";
import { usePermission } from "@/hooks/use-permission";

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
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.DEVICES.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [editing, setEditing] = useState<Device | null>(null);
  const { toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Aapka original CRUD hook
  type PaginatedDeviceResponse = {
  data: Device[];
  totalPages: number;
  totalCount: number;
  onlineCount: number;
  offlineCount: number;
};

  // const {
  //   data: response = {
  //     data: [],
  //     totalPages: 1,
  //     totalCount: 0,
  //   },
  //   isLoading,
  //   create,
  //   update,
  //   remove,
  //   isCreating,
  //   isUpdating,
  //   refetch,
  // } = useCrud<PaginatedDeviceResponse>(
  //   `/api/devices?page=${page}&pageSize=${pageSize}`,
  //   "Device",
  // );
  // const paginatedResponse = response as unknown as PaginatedDeviceResponse;

  // const data: Device[] = paginatedResponse?.data || [];
  // const totalPages = paginatedResponse?.totalPages || 1;
  // const totalCount = paginatedResponse?.totalCount || 0;

  const [pagedResponse, setPagedResponse] =
  useState<PaginatedDeviceResponse>({
    data: [],
    totalPages: 1,
    totalCount: 0,
    onlineCount: 0,
    offlineCount: 0,
  });

const {
  isLoading,
  create,
  update,
  remove,
  isCreating,
  isUpdating,
} = useCrud<any>("/api/devices", "Device");

const fetchDevices = async () => {
  const res = await fetch(
    `/api/devices?page=${page}&pageSize=${pageSize}`
  );

  const data = await res.json();

  setPagedResponse(data);
};

useEffect(() => {
  fetchDevices();
}, [page]);

const data: Device[] = pagedResponse?.data || [];
const totalPages = pagedResponse?.totalPages || 1;
const totalCount = pagedResponse?.totalCount || 0;

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ["/api/zones"] });
  if (!canView) {
    return (
      <div className="flex h-[450px] items-center justify-center text-muted-foreground">
        You do not have permission to view devices.
      </div>
    );
  }
  const online = pagedResponse?.onlineCount || 0;
const offline = pagedResponse?.offlineCount || 0;

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
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dotClass}`}
              ></span>
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
            <span
              className={`text-sm font-medium ${d.status === "online" ? "text-green-600" : "text-slate-500"}`}
            >
              {d.status === "online" ? "Active" : "Last seen"}
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
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(d);
                setFieldErrors({});
                setDialogOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
  size="icon"
  variant="ghost"
  title="Delete"
  className="text-destructive hover:text-destructive hover:bg-destructive/10"
  onClick={async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const idToDelete = d.id || (d as any).msId;

    if (
      idToDelete &&
      window.confirm("Are you sure you want to delete this device?")
    ) {
      await remove(idToDelete);

      setTimeout(async () => {
        await fetchDevices();
      }, 300);
    }
  }}
>
  <Trash2 className="w-4 h-4" />
</Button>
          )}
        </div>
      ),
    },
  ].filter((col) => {
    // AGER 'actions' column hai aur na edit ki permission hai na delete ki, toh column hata do
    if (col.key === "actions") {
      return canEdit || canDelete;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Devices"
        description="Manage access control devices"
        action={
          canAdd && (
            <Button
              onClick={async () => {
  setEditing(null);
  await fetchDevices();
}}
              className="gap-2"
              disabled={isLoading} // Optional: Fetching ke waqt double click rokne ke liye
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : "transition-transform group-hover:rotate-180"}`}
              />
              {isLoading ? "Syncing..." : "Sync"}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-4 gap-3">
        {" "}
        {/* 2 se badha kar 4 kiya */}
        <Card>
          <CardContent className="p-2 text-center">
            {" "}
            {/* Padding bhi p-3 se p-2 kar di */}
            <p className="text-xl font-bold text-green-600">{online}</p>
            <p className="text-[10px] text-muted-foreground uppercase">
              Online
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-xl font-bold text-muted-foreground">{offline}</p>
            <p className="text-[10px] text-muted-foreground uppercase">
              Offline
            </p>
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
        {/* Left Side: Stats */}
        <div className="text-sm text-muted-foreground order-2 md:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {(page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, pagedResponse?.totalCount || 0)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {pagedResponse?.totalCount || 0}
          </span>{" "}
          shifts
        </div>

        {/* Right Side: Controls */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          {/* Direct Jump (Professional Touch) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Go to Page
            </span>
            <input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={page}
              className="w-12 h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = Number(e.currentTarget.value);
                  if (val >= 1 && val <= totalPages) setPage(val);
                }
              }}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-1">
            {/* First Page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <span className="sr-only">First Page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>

            {/* Page Indicator */}
            <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
              {page} / {totalPages}
            </div>

            {/* Next */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last Page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <span className="sr-only">Last Page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {(canAdd || canEdit) && (
        <CrudDialog
          open={dialogOpen}
          errors={fieldErrors}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
            setFieldErrors({});
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
          onSubmit={async (formData) => {
            try {
              setFieldErrors({});

              // 🛡️ XSS Validation (EDIT ONLY)
              const validationErrors = validateNoHtml(formData);
              if (Object.keys(validationErrors).length > 0) {
                setFieldErrors(validationErrors);
                return;
              }

              if (formData.locationId)
                formData.locationId = Number(formData.locationId);

              if (formData.zoneId) formData.zoneId = Number(formData.zoneId);

              // 🚀 UPDATE ONLY (kyunki add nahi hai)
              if (editing) {
                const updateId = editing.id || (editing as any).msId;
                await update({ id: updateId, data: formData });

await fetchDevices();

toast({
  title: "Success",
  description: "Device updated successfully",
});
              }

              setDialogOpen(false);
              setEditing(null);
            } catch (err: any) {
              toast({
                variant: "destructive",
                title: "Error",
                description: err?.message || "Something went wrong",
              });
            }
          }}
          isPending={isCreating || isUpdating}
        />
      )}
    </div>
  );
}
