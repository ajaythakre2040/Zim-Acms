import { useState, useEffect, useMemo } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Pencil,
  Trash2,
  MonitorSmartphone,
  X,
  Settings2,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Zone, Door, Site } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { validateNoHtml } from "../lib/validation";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG, UNIT_TYPE } from "../../../server/constant";
import { PaginationSize } from "@/components/ui/pagination";
type PaginatedResponse<T> = {
  data: T[];
  totalPages: number;
  totalCount: number;
};
export default function ZonesDoorsPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.DOORS.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  const queryClient = useQueryClient();
  const [zoneDialog, setZoneDialog] = useState(false);
  const [doorDialog, setDoorDialog] = useState(false);
  const [mappingDialog, setMappingDialog] = useState(false);

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingDoor, setEditingDoor] = useState<Door | null>(null);
  const [selectedDoorForMapping, setSelectedDoorForMapping] =
    useState<Door | null>(null);
  const mappingCrud = useCrud<any>("/api/door-devices", "Device Mapping");

  const [pendingMapping, setPendingMapping] = useState<{
    inDeviceIds: number[];
    outDeviceIds: number[];
  }>({
    inDeviceIds: [],
    outDeviceIds: [],
  });

  const zoneCrud = useCrud<Zone>("/api/zones", "Zone");

  // ==========================
  // PAGINATION STATES
  // ==========================
  const [doorPage, setDoorPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // ==========================
  // CRUD
  // ==========================
  const doorCrud = useCrud<Door>("/api/doors", "Door");

  // ==========================
  // PAGINATION RESPONSE STATE
  // ==========================
  const [pagedDoors, setPagedDoors] = useState<PaginatedResponse<Door> | null>(
    null,
  );

  // ==========================
  // FETCH DOORS
  // ==========================
  const fetchDoors = async () => {
    const res = await fetch(
      `/api/doors?page=${doorPage}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
    );

    const data = await res.json();

    setPagedDoors(data);
  };

  // ==========================
  // INITIAL + PAGE CHANGE FETCH
  // ==========================
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoors();
    }, 300);

    return () => clearTimeout(timer);
  }, [doorPage, search, pageSize]);
  // ==========================
  // PAGINATION DATA
  // ==========================
  const doors = pagedDoors?.data || [];
  const doorTotalPages = pagedDoors?.totalPages || 1;
  const doorTotalCount = pagedDoors?.totalCount || 0;

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: devices = [] } = useQuery<any[]>({
    queryKey: ["/api/devices"],
  });
  // const [errors, setErrors] = useState<{ locationId?: string }>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const currentMapping = mappingCrud.data?.find(
    (m: any) => m.doorId === selectedDoorForMapping?.id,
  );

  useEffect(() => {
    if (mappingDialog && selectedDoorForMapping) {
      setPendingMapping({
        inDeviceIds: Array.isArray(currentMapping?.inDeviceIds)
          ? [...currentMapping.inDeviceIds]
          : [],
        outDeviceIds: Array.isArray(currentMapping?.outDeviceIds)
          ? [...currentMapping.outDeviceIds]
          : [],
      });
    }
  }, [mappingDialog, selectedDoorForMapping, currentMapping]);

  const toggleDevice = (deviceId: number, direction: "in" | "out") => {
    setPendingMapping((prev) => {
      const key = direction === "in" ? "inDeviceIds" : "outDeviceIds";
      const currentIds = prev[key];
      const newIds = currentIds.includes(deviceId)
        ? currentIds.filter((id) => id !== deviceId)
        : [...currentIds, deviceId];
      return { ...prev, [key]: newIds };
    });
  };

  const handleBulkAction = (
    direction: "in" | "out",
    action: "all" | "clear",
  ) => {
    const allDeviceIds = devices.map((d) => d.msId);
    setPendingMapping((prev) => ({
      ...prev,
      [direction === "in" ? "inDeviceIds" : "outDeviceIds"]:
        action === "all" ? allDeviceIds : [],
    }));
  };

  // const handleSaveMapping = async () => {
  //   if (!selectedDoorForMapping) return;

  //   const payload = {
  //     doorId: selectedDoorForMapping.id,
  //     inDeviceIds: pendingMapping.inDeviceIds,
  //     outDeviceIds: pendingMapping.outDeviceIds,
  //   };

  //   try {
  //     if (currentMapping) {
  //       await mappingCrud.update({ id: currentMapping.id, data: payload });
  //     } else {
  //       await mappingCrud.create(payload);
  //     }
  //     queryClient.invalidateQueries({ queryKey: ["/api/doors"] });
  //     queryClient.invalidateQueries({ queryKey: ["/api/door-devices"] });
  //     setMappingDialog(false);
  //   } catch (err) {
  //     console.error("Save failed", err);
  //   }
  // };

  const handleSaveMapping = async () => {
    if (!selectedDoorForMapping) return;

    const payload = {
      doorId: selectedDoorForMapping.id,
      inDeviceIds: pendingMapping.inDeviceIds,
      outDeviceIds: pendingMapping.outDeviceIds,
    };

    try {
      if (currentMapping) {
        await mappingCrud.update({
          id: currentMapping.id,
          data: payload,
        });
      } else {
        await mappingCrud.create(payload);
      }

      // ✅ latest data fetch karo
      await fetchDoors();

      // optional
      queryClient.invalidateQueries({
        queryKey: ["/api/door-devices"],
      });

      setMappingDialog(false);
    } catch (err) {
      console.error("Save failed", err);
    }
  };
  const zoneFields: FieldConfig[] = useMemo(
    () => [
      { key: "name", label: "Zone Name", required: true },
      {
        key: "code",
        label: "Code",
        required: true,
        disabled: !!editingZone,
      },
      // {
      //   key: "locationId",
      //   label: "Site",
      //   type: "select",
      //   required: true,
      //   defaultValue: "placeholder", // 👈 empty nahi
      //   options: [
      //     { value: "placeholder", label: "Select Site" }, // 👈 change here
      //     ...sites.map((s) => ({
      //       value: String(s.id),
      //       label: s.name,
      //     })),
      //   ],
      // },
      {
        key: "locationId",
        label: "Site",
        type: "select",
        required: true,
        defaultValue: "placeholder",
        options: [
          { value: "placeholder", label: "Select Site" },
          ...sites.map((s) => ({
            value: String(s.id),
            label: s.name,
          })),
        ],

        // 👇 🔥 YE ADD KAR
        validate: (value: string) => {
          if (!value || value === "placeholder") {
            return "Please select a site";
          }
          return true;
        },
      },
      {
        key: "securityLevel",
        label: "Security Level (1-5)",
        type: "number",
        defaultValue: 1,
      },
      { key: "isHighRisk", label: "High Risk Zone", type: "switch" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "isActive", label: "Active", type: "switch", defaultValue: true },
    ],
    [sites, editingZone],
  );

  const doorFields: FieldConfig[] = useMemo(
    () => [
      { key: "name", label: "Door Name", required: true },
      {
        key: "code",
        label: "Code",
        required: true,
        disabled: !!editingDoor,
      },
      {
        key: "unit",
        label: "Unit",
        type: "select",
        options: Object.values(UNIT_TYPE).map((unit) => ({
          value: unit,
          label: unit.replace("_", " "), // e.g. "UNIT_1" -> "UNIT 1" (UI format)
        })),
        defaultValue: UNIT_TYPE.UNIT_1, // ya simple "UNIT_1"
      },

      {
        key: "doorType",
        label: "Type",
        type: "select",
        options: [
          { value: "standard", label: "Standard" },
          { value: "turnstile", label: "Turnstile" },
          { value: "barrier", label: "Barrier" },
          { value: "gate", label: "Gate" },
          { value: "emergency", label: "Emergency" },
        ],
        defaultValue: "standard",
      },
      { key: "requires2FA", label: "Requires 2FA", type: "switch" },
      { key: "isHighRisk", label: "High Risk", type: "switch" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "normal", label: "Normal" },
          { value: "locked", label: "Locked" },
          { value: "unlocked", label: "Unlocked" },
          { value: "alarm", label: "Alarm" },
          { value: "maintenance", label: "Maintenance" },
        ],
        defaultValue: "normal",
      },
      { key: "isActive", label: "Active", type: "switch", defaultValue: true },
    ],
    [sites, zoneCrud.data, editingDoor],
  );

  const secLevelColors = [
    "",
    "default",
    "secondary",
    "secondary",
    "destructive",
    "destructive",
  ];
  const doorStatusColors: Record<string, string> = {
    normal: "default",
    locked: "secondary",
    unlocked: "outline",
    alarm: "destructive",
    maintenance: "secondary",
  };

  const zoneColumns = [
    {
      key: "name",
      label: "Zone",
      render: (z: Zone) => <span className="font-medium">{z.name}</span>,
    },
    { key: "code", label: "Code", hideOnMobile: true },
    {
      key: "site",
      label: "Site",
      hideOnMobile: true,
      render: (z: Zone) =>
        sites.find((s) => s.id === z.locationId)?.name || "-",
    },
    {
      key: "securityLevel",
      label: "Level",
      render: (z: Zone) => (
        <Badge variant={secLevelColors[z.securityLevel || 1] as any}>
          L{z.securityLevel}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-left",
      className: "text-left",
      render: (z: Zone) => (
        <div className="flex gap-1 justify-start items-center">
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setEditingZone(z);
                setZoneDialog(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (window.confirm("Delete this zone?")) zoneCrud.remove(z.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const doorColumns = [
    {
      key: "name",
      label: "Door",
      render: (d: Door) => <span className="font-medium">{d.name}</span>,
    },
    { key: "code", label: "Code", hideOnMobile: true },
    {
      key: "unit",
      label: "Unit",
      render: (d: Door) => (
        <Badge variant="secondary" className="capitalize">
          {d.unit}
        </Badge>
      ),
    },

    {
      key: "isactive",
      label: "IsActive",
      render: (d: Door) => {
        const activeKey = d.isActive ? "active" : "inactive";

        return (
          <Badge
            variant={
              (doorStatusColors[activeKey] ||
                (d.isActive ? "default" : "destructive")) as any
            }
          >
            {d.isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },

    {
      key: "inDevices",
      label: "IN Devices",
      render: (d: any) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {d.inDevices?.length > 0 ? (
            d.inDevices.map((dev: any) => (
              <Badge
                key={dev.id}
                variant="secondary"
                className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 font-normal"
              >
                {dev.name}
              </Badge>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground italic">
              None
            </span>
          )}
        </div>
      ),
    },
    {
      key: "outDevices",
      label: "OUT Devices",
      render: (d: any) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {d.outDevices?.length > 0 ? (
            d.outDevices.map((dev: any) => (
              <Badge
                key={dev.id}
                variant="secondary"
                className="text-[10px] bg-green-50 text-green-700 border-green-100 font-normal"
              >
                {dev.name}
              </Badge>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground italic">
              None
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-left",
      className: "text-left",
      render: (d: Door) => (
        <div className="flex gap-1 justify-start items-center">
          <TooltipProvider delayDuration={300}>
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDoorForMapping(d);
                      setMappingDialog(true);
                    }}
                  >
                    <MonitorSmartphone className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Assign Hardware</TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDoor(d);
                      setDoorDialog(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Door</TooltipContent>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={async (e) => {
                      e.stopPropagation();

                      if (window.confirm("Delete this door?")) {
                        await doorCrud.remove(d.id);

                        setTimeout(async () => {
                          await fetchDoors();
                        }, 300);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Door</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Doors"
        description="Manage security and access points"
      />

      <Tabs defaultValue="doors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="doors">Doors</TabsTrigger>
          {/* <TabsTrigger value="zones">Zones</TabsTrigger> */}
        </TabsList>

        <TabsContent value="doors">
          <div className="mb-4 flex justify-end">
            {canAdd && (
              <Button
                onClick={() => {
                  setEditingDoor(null);
                  setDoorDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Door
              </Button>
            )}
          </div>

          <div className="relative max-w-sm mb-4">
            <input
              placeholder="Search doors..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDoorPage(1); // reset page
              }}
              className="w-full h-9 border rounded-md pl-3"
            />
          </div>
          <DataTable
            columns={doorColumns}
            data={doors}
            isLoading={doorCrud.isLoading}
            pageSize={pageSize}
          />
          {/* <DataTable
            columns={doorColumns}
            data={doors}
            isLoading={doorCrud.isLoading}
            searchable
            searchKeys={["name", "code"]}
          /> */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
            {/* Left Side: Stats */}
            <div className="text-sm text-muted-foreground order-2 md:order-1">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(doorPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(doorPage * pageSize, doorTotalCount)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {doorTotalCount}
              </span>{" "}
              doors
            </div>

            {/* Right Side: Controls */}
            <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
              {/* Go to Page Input */}
              <div className="flex items-center gap-2">
                <PaginationSize
                  pageSize={pageSize}
                  setPageSize={(val) => {
                    setPageSize(val);
                    setDoorPage(1); // Page size change hone par 1st page par jayein
                  }}
                />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Go to Page
                </span>

                <input
                  type="number"
                  min={1}
                  max={doorTotalPages}
                  defaultValue={doorPage}
                  className="w-12 h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = Number(e.currentTarget.value);
                      if (val >= 1 && val <= doorTotalPages) {
                        setDoorPage(val);
                      }
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
                  onClick={() => setDoorPage(1)}
                  disabled={doorPage === 1}
                >
                  <span className="sr-only">First Page</span>⏮
                </Button>

                {/* Previous */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() => setDoorPage((p) => Math.max(1, p - 1))}
                  disabled={doorPage === 1}
                >
                  ◀ Prev
                </Button>

                {/* Page Indicator */}
                <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
                  {doorPage} / {doorTotalPages}
                </div>

                {/* Next */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() =>
                    setDoorPage((p) => Math.min(doorTotalPages, p + 1))
                  }
                  disabled={doorPage === doorTotalPages}
                >
                  Next ▶
                </Button>

                {/* Last Page */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDoorPage(doorTotalPages)}
                  disabled={doorPage === doorTotalPages}
                >
                  <span className="sr-only">Last Page</span>⏭
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="zones">
          <div className="mb-4 flex justify-end">
            {canAdd && (
              <Button
                onClick={() => {
                  setEditingZone(null);
                  setZoneDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Zone
              </Button>
            )}
          </div>
          <DataTable
            columns={zoneColumns}
            data={zoneCrud.data}
            isLoading={zoneCrud.isLoading}
            searchable
            searchKeys={["name", "code"]}
          />
        </TabsContent>
      </Tabs>

      {/* Zone Dialog */}
      {(canAdd || canEdit) && (
        <CrudDialog
          open={zoneDialog}
          errors={errors}
          onClose={() => {
            setZoneDialog(false);
            setEditingZone(null);
            setErrors({}); // ✅ reset error on close
          }}
          title={editingZone ? "Edit Zone" : "Add Zone"}
          fields={zoneFields}
          initialData={
            editingZone
              ? { ...editingZone, locationId: String(editingZone.locationId) }
              : undefined
          }
          onSubmit={async (data) => {
            try {
              setErrors({}); // Reset previous errors

              // :fire: 1. HTML Validation Check (Jaise Shift/Site mein kiya tha)
              const validationErrors = validateNoHtml(data);
              if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return; // :x: Agar HTML mila toh yahi stop kar do
              }

              // 2. Specific field check (Location selection)
              if (data.locationId === "placeholder") {
                setErrors({ locationId: "Please select a site" });
                return;
              }

              // 3. Payload preparation
              const payload = {
                ...data,
                locationId: Number(data.locationId),
              };

              // 4. API Calls
              if (editingZone) {
                await zoneCrud.update({ id: editingZone.id, data: payload });
              } else {
                await zoneCrud.create(payload);
              }

              // :white_check_mark: Success: Error nahi aaya toh hi close hoga
              setZoneDialog(false);
              setEditingZone(null);
            } catch (err: any) {
              // Agar duplicate code ka error aaya
              const msg = err.response?.data?.message || err.message || "";
              if (
                msg.toLowerCase().includes("unique") ||
                msg.toLowerCase().includes("code")
              ) {
                setErrors({
                  code: "This code is already in use. Please use a unique code.",
                });
              } else {
                setErrors({ general: "Failed to save zone." });
              }
              // Dialog close nahi hoga, user error dekh payega
            }
          }}
          isPending={zoneCrud.isCreating || zoneCrud.isUpdating}
        />
      )}

      {/* ✅ ADD THIS RIGHT AFTER CrudDialog */}
      {errors.locationId && (
        <div className="fixed top-5 right-5 bg-red-500 text-white px-4 py-2 rounded shadow">
          {errors.locationId}
        </div>
      )}

      {/* Door Dialog */}
      {(canAdd || canEdit) && (
        <CrudDialog
          open={doorDialog}
          errors={errors}
          onClose={() => {
            setDoorDialog(false);
            setEditingDoor(null);
          }}
          title={editingDoor ? "Edit Door" : "Add Door"}
          fields={doorFields}
          initialData={
            editingDoor
              ? {
                ...editingDoor,
                locationId: editingDoor.locationId
                  ? String(editingDoor.locationId)
                  : "",
                zoneId: editingDoor.zoneId ? String(editingDoor.zoneId) : "",
              }
              : undefined
          }
          onSubmit={async (data) => {
            try {
              setErrors({}); // Reset errors

              // :fire: 1. HTML Validation Check (Consistent with other pages)
              const validationErrors = validateNoHtml(data);
              if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return; // :x: Stop if HTML is found
              }

              // 2. Prepare Payload (Converting IDs to Numbers)
              const payload = {
                ...data,
                locationId: data.locationId ? Number(data.locationId) : null,
                zoneId: data.zoneId ? Number(data.zoneId) : null,
              };

              // 3. API Operation with 'await'
              if (editingDoor) {
                await doorCrud.update({ id: editingDoor.id, data: payload });
              } else {
                await doorCrud.create(payload);
              }

              await fetchDoors();

              // :white_check_mark: Success path
              setDoorDialog(false);
              setEditingDoor(null);
            } catch (err: any) {
              const msg = err.response?.data?.message || err.message || "";
              if (
                msg.toLowerCase().includes("unique") ||
                msg.toLowerCase().includes("code")
              ) {
                setErrors({
                  code: "Duplicate door code. Please enter a unique one.",
                });
              } else {
                setErrors({ general: "Error saving door details." });
              }
            }
          }}
          isPending={doorCrud.isCreating || doorCrud.isUpdating}
        />
      )}
      {/* Device Mapping Dialog */}
      <Dialog open={mappingDialog} onOpenChange={setMappingDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Settings2 className="w-5 h-5 text-primary" />
              Hardware: {selectedDoorForMapping?.name}
            </DialogTitle>
            <DialogDescription>
              Select entry and exit devices for this door.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 py-6">
            {/* IN Section */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-blue-600 uppercase">
                Entry (IN) Devices
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-slate-50 border-slate-200 h-11 text-slate-500 font-normal"
                  >
                    <span className="truncate">
                      {pendingMapping.inDeviceIds.length > 0
                        ? `${pendingMapping.inDeviceIds.length} Devices selected`
                        : "Click to add device..."}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[470px] p-2"
                  align="start"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-4 p-2 mb-2 border-b border-slate-100 text-[11px] font-bold">
                    <button
                      className="text-blue-500 hover:underline uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkAction("in", "all");
                      }}
                    >
                      SELECT ALL
                    </button>
                    <button
                      className="text-red-500 hover:underline uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkAction("in", "clear");
                      }}
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {devices.map((device) => {
                      const isSelected = pendingMapping.inDeviceIds.includes(
                        device.msId,
                      );
                      return (
                        <div
                          key={device.msId}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-primary/5 text-primary" : "hover:bg-slate-50"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDevice(device.msId, "in");
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              className="border-slate-300"
                              onCheckedChange={() =>
                                toggleDevice(device.msId, "in")
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm font-medium">
                              {device.name}{" "}
                              {device.ipAddress && (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">
                                  ({device.ipAddress})
                                </span>
                              )}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2">
                {pendingMapping.inDeviceIds.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5 bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100"
                  >
                    {devices.find((d) => d.msId === id)?.name || `ID: ${id}`}
                    <X
                      className="w-3.5 h-3.5 ml-2 cursor-pointer text-blue-400 hover:text-red-500"
                      onClick={() => toggleDevice(id, "in")}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <hr className="border-dashed border-slate-200" />

            {/* OUT Section */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-green-600 uppercase">
                Exit (OUT) Devices
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-slate-50 border-slate-200 h-11 text-slate-500 font-normal"
                  >
                    <span className="truncate">
                      {pendingMapping.outDeviceIds.length > 0
                        ? `${pendingMapping.outDeviceIds.length} Devices selected`
                        : "Click to add device..."}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[470px] p-2"
                  align="start"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-4 p-2 mb-2 border-b border-slate-100 text-[11px] font-bold">
                    <button
                      className="text-blue-500 hover:underline uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkAction("out", "all");
                      }}
                    >
                      SELECT ALL
                    </button>
                    <button
                      className="text-red-500 hover:underline uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkAction("out", "clear");
                      }}
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {devices.map((device) => {
                      const isSelected = pendingMapping.outDeviceIds.includes(
                        device.msId,
                      );
                      return (
                        <div
                          key={device.msId}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-primary/5 text-primary" : "hover:bg-slate-50"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDevice(device.msId, "out");
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              className="border-slate-300"
                              onCheckedChange={() =>
                                toggleDevice(device.msId, "out")
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm font-medium">
                              {device.name}{" "}
                              {device.ipAddress && (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">
                                  ({device.ipAddress})
                                </span>
                              )}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2">
                {pendingMapping.outDeviceIds.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5 bg-green-50 border-green-100 text-green-700 hover:bg-green-100"
                  >
                    {devices.find((d) => d.msId === id)?.name || `ID: ${id}`}
                    <X
                      className="w-3.5 h-3.5 ml-2 cursor-pointer text-green-400 hover:text-red-500"
                      onClick={() => toggleDevice(id, "out")}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              className="w-full shadow-md font-bold text-base h-11"
              onClick={handleSaveMapping}
              disabled={mappingCrud.isUpdating || mappingCrud.isCreating}
            >
              {mappingCrud.isUpdating || mappingCrud.isCreating
                ? "SAVING..."
                : "DONE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
