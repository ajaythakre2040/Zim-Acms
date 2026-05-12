import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck,RefreshCw, Pencil, Eye, Trash2, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { validateNoHtml } from "@/lib/validation";
import type {
  Person,
  Department,
  Designation,
  Company,
  Category,
  Site,
  Role,
  Device,
} from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";
type RoleWithDoors = Role & {
  assignedDoorNames?: string;
};
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
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(MENU_CONFIG.EMPLOYEES.code);
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roledialogOpen, setRoleDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [roleassign, setRoleAssign] = useState<Person | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const { toast } = useToast();
  const [selectedDoorIds, setSelectedDoorIds] = useState<number[]>([]);
  const [doorSearch, setDoorSearch] = useState("");
  const {
    data: people = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  const { data: designations = [] } = useQuery<Designation[]>({
    queryKey: ["/api/designations"],
  });
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  // const { data: roles = [] } = useQuery<RoleWithDoors[]>({
  //   queryKey: ["/api/roles"],
  // });

  const { data: doors = [], isLoading: isLoadingDoors } = useQuery<any[]>({
    queryKey: ["/api/doors"],
  });
  const { data: allDevices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });
  const [deviceStatusOpen, setDeviceStatusOpen] = useState(false);
  const [deviceViewPerson, setDeviceViewPerson] = useState<Person | null>(null);
  const [deviceSearch, setDeviceSearch] = useState("");
  // Shifts aur Departments ke liye queries
  const { data: shifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts"],
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { data: deviceLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["/api/device-status", deviceViewPerson?.employeeCode],
    enabled: !!deviceViewPerson,
    queryFn: async () => {
      const r = await apiRequest(
        "GET",
        `/api/people/device-status/${deviceViewPerson?.employeeCode}`,
      );
      return r.json();
    },
  });
  useEffect(() => {
    if (deviceStatusOpen) {
      refetchLogs();
    }
  }, [deviceStatusOpen]);

  useEffect(() => {
    if (roledialogOpen && roleassign) {
      const existingDoors = (roleassign as any)?.doorIds || [];

      console.log("Existing Doors:", existingDoors); // 🔍 debug

      setSelectedDoorIds(existingDoors);
    }
  }, [roledialogOpen, roleassign]);

  const bulkEmergencyUnblockMut = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/emergency/bulk-unblock", {});
      return r.json();
    },
    onSuccess: (response) => {
      // UI refresh
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });

      toast({
        title: "Emergency Action Success",
        description: response.message || "Commands dispatched successfully.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Emergency Action Failed",
        description: e.message,
        variant: "destructive",
      }),
  });
  const emergencyToggleMut = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiRequest("POST", "/api/people/emergency-toggle", data);
      return r.json();
    },
    onSuccess: (response) => {
      // 1. Sabse pehle cache ko manual update karo (Instant UI change)
      queryClient.setQueryData(
        ["/api/device-status", deviceViewPerson?.employeeCode],
        (oldData: any) => {
          const newLog = response.data?.[0] || response.data; // Ensure we get the log object
          if (!oldData) return [newLog];

          const filtered = oldData.filter(
            (l: any) => Number(l.deviceId) !== Number(newLog.deviceId),
          );
          return [newLog, ...filtered];
        },
      );

      queryClient.invalidateQueries({
        queryKey: ["/api/device-status", deviceViewPerson?.employeeCode],
      });
      refetchLogs(); // Force refetch
      toast({ title: "Updated" });
    },
    onError: (e: Error) =>
      toast({
        title: "Sync Error",
        description: e.message,
        variant: "destructive",
      }),
  });
  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiRequest("POST", "/api/people", data);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setDialogOpen(false);
      toast({ title: "Person created" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await apiRequest("PUT", `/api/people/${id}`, data);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "Person updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/people/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({ title: "Success", description: "Person deleted successfully." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const fetchAssignedDoors = async () => {
    try {
      const res = await apiRequest(
        "GET",
        `/api/employee-door-assignments/${roleassign?.employeeCode}`,
      );

      const data = await res.json();

      setSelectedDoorIds(data?.doorIds || []);
    } catch (err) {
      console.error("Fetch Assigned Doors Error:", err);
      setSelectedDoorIds([]);
    }
  };

  useEffect(() => {
    if (roledialogOpen && roleassign) {
      fetchAssignedDoors();
    }
  }, [roledialogOpen, roleassign]);

  const fields: FieldConfig[] = [
    { key: "employeeName", label: "Employee Name", required: true },
    {
      key: "employeeCode",
      label: "Employee Code",
      readOnly: !!editing,
      placeholder: editing
        ? "Cannot change code during edit"
        : "Enter unique employee code",
    } as any,
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },

    {
      key: "personType",
      label: "Type",
      type: "select",
      options: Object.entries(personTypeLabels).map(([v, l]) => ({
        value: v,
        label: l,
      })),
      defaultValue: "employee",
    },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "departmentId",
      label: "Department",
      type: "select",
      options: departments.map((d) => ({ value: String(d.id), label: d.name })),
    },
    {
      key: "designationId",
      label: "Designation",
      type: "select",
      options: designations.map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    },
    // {
    //   key: "shiftId",
    //   label: "Shift",
    //   type: "select",
    //   options: shifts.map((s: any) => ({
    //     value: String(s.id),
    //     label: s.name || s.code || `Shift ${s.id}`,
    //   })),
    // },

    {
      key: "companyId",
      label: "Company",
      type: "select",
      options: companies.map((c) => ({ value: String(c.id), label: c.name })),
    },
    // {
    //   key: "locationId",
    //   label: "Location",
    //   type: "select",
    //   options: sites.map((s) => ({ value: String(s.id), label: s.name })),
    // },
    { key: "dateOfJoining", label: "Date of Joining", type: "date" },
    // {
    //   key: "lastSeenTime",
    //   label: "Last Seen",
    //   type: "text",
    //   readOnly: true,
    //   placeholder: "Auto-generated from logs",
    // },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "suspended", label: "Suspended" },
      ],
      defaultValue: "active",
    },
    { key: "riskTier", label: "Risk Tier (1-5)", type: "number" },
  ];

  const hiddenOnEdit = ["companyId", "riskTier"];

  const filteredFields = fields.filter(
    (f) => !(editing && hiddenOnEdit.includes(f.key)),
  );

  const columns = [
    {
      key: "employeeName",
      label: "Name",
      render: (p: Person) => (
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">
              {(p.employeeName || "?")[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{p.employeeName}</p>
          </div>
        </div>
      ),
    },
    { key: "employeeCode", label: "Emp Code", hideOnMobile: true },
    {
      key: "is_lockout_enabled",
      label: "Cabin Lockout",
      hideOnMobile: true,
      render: (p: any) => {
        const isEnabled = p.is_lockout_enabled;

        return (
          <Badge
            variant={isEnabled ? "destructive" : "outline"}
            className={`text-xs font-bold ${isEnabled
              ? "bg-red-50 text-red-600 border-red-300"
              : "bg-green-50 text-green-600 border-green-300"
              }`}
          >
            {isEnabled ? "ACTIVE" : "INACTIVE"}
          </Badge>
        );
      },
    },
    // {
    //   key: "roleName",
    //   label: "Role",
    //   hideOnMobile: true,
    //   render: (p: any) => (
    //     <span
    //       className={
    //         p.roleName
    //           ? "text-sm text-foreground"
    //           : "text-sm text-muted-foreground"
    //       }
    //     >
    //       {p.roleName || "No Role Assigned"}
    //     </span>
    //   ),
    // },

    {
      key: "currentAccessRule",
      label: "Current Rule",
      hideOnMobile: true,
      render: (p: any) => {
        const ruleId = p.ruleid ?? 0;

        const ruleNames: Record<number, string> = {
          0: "No Rule Assigned",
          1: "Main Gate In",
          2: "Cabin In",
          3: "Cabin Out",
          4: "Lockout Active",
          5: "Main Gate Out",
        };

        return (
          <span className="text-sm">
            {ruleNames[ruleId as number] || "Unknown"}
          </span>
        );
      },
    },

    // ==================== LAST DOOR ACCESS (Simple) ====================
    {
      key: "lastDoorAccess",
      label: "Last Door Access",
      hideOnMobile: true,
      render: (p: any) => {
        if (!p.lastPunchDoorId) {
          return <span className="text-sm text-muted-foreground">Never</span>;
        }
        const formattedTime = new Date(p.updatedAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div className="text-sm">
            <div className="font-medium">{p.lastPunchDoorName}</div>
          </div>
        );
      },
    },
    // {
    //   key: "f",
    //   label: "Last Seen",
    //   hideOnMobile: true,
    //   render: (p: any) => {
    //     const timestamp = p.lastSeenTime;

    //     if (!timestamp) {
    //       return <span className="text-sm text-muted-foreground">No Logs</span>;
    //     }

    //     const formattedTime = new Date(timestamp).toLocaleString("en-IN", {
    //       timeZone: "Asia/Kolkata", // 🔥 important fix
    //       day: "2-digit",
    //       month: "short",
    //       year: "numeric",
    //       hour: "2-digit",
    //       minute: "2-digit",
    //       hour12: true,
    //     });

    //     return (
    //       <div className="text-sm">
    //         <span className="font-medium text-foreground">{formattedTime}</span>
    //       </div>
    //     );
    //   },
    // },
    {
      key: "lastSeenTime", // 'f' ki jagah sahi key 'lastSeenTime' use karein
      label: "Last Seen",
      hideOnMobile: true,
      render: (p: any) => (
        <div className="text-sm">
          <span className="font-medium text-foreground">
            {formatDateTime(p?.lastSeenTime)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (p: Person) => (
        <Badge variant={statusColors[p.status || "active"] as any}>
          {p.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (p: Person) => (
        <TooltipProvider delayDuration={100}>
          <div className="flex">
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeviceViewPerson(p); // Is person ko select karo
                      setDeviceStatusOpen(true); // Modal kholo
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Device Access Status</p>
                </TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoleAssign(p);
                      setRoleDialogOpen(true);
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign Role</p>
                </TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              < Tooltip >
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p);
                      setFieldErrors({});
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
            )}
              {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-destructive"
                  disabled={deleteMut.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm("Delete this person from all systems?")
                    ) {
                      deleteMut.mutate(p.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
              )}
          </div>
        </TooltipProvider >
      ),
    },
  ].filter(col => {
    // AGER 'actions' column hai aur na edit ki permission hai na delete ki, toh column hata do
    if (col.key === 'actions') {
      return canEdit || canDelete;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Employees"
        description="Manage employees, contractors, and others"
        action={
          <div className="flex gap-2">
            {/* 🔴 EMERGENCY BUTTON */}
           { canEdit && (
            <Button
              variant="destructive"
              className="w-[220px] flex items-center justify-center gap-2"
              onClick={() => {
                if (
                  window.confirm(
                    "⚠️ ALERT: This will UNBLOCK ALL employees on ALL devices. Proceed?",
                  )
                ) {
                  bulkEmergencyUnblockMut.mutate();
                }
              }}
              disabled={bulkEmergencyUnblockMut.isPending}
            >
              <RefreshCw
                className={`w-4 h-4 ${bulkEmergencyUnblockMut.isPending ? "animate-spin" : ""
                  }`}
              />
              <span className="w-[130px] text-center">
                Emergency Unblock All
              </span>
            </Button>
                )}
            {/* 🔄 SYNC BUTTON (existing) */}
            {/* <Button
              variant="outline"
              className="w-[140px] flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  await refetch();
                  toast({
                    title: "Data Synced",
                    description:
                      "The people list has been refreshed successfully.",
                  });
                } catch (error) {
                  toast({
                    title: "Sync Failed",
                    description: "Could not refresh data.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={isFetching}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
              />
              {isFetching ? "Syncing..." : "Sync"}
            </Button> */}
            <Button
              variant="outline"
              className="w-[140px] flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  await refetch();
                  toast({
                    title: "Data Synced",
                    description:
                      "The people list has been refreshed successfully.",
                  });
                } catch (error) {
                  toast({
                    title: "Sync Failed",
                    description: "Could not refresh data.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={isFetching}
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
              />
              <span className="w-[80px] text-center">Sync</span>
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={people}
        isLoading={isLoading}
        searchable
        searchKeys={["employeeName", "employeeCode", "email"]}
        emptyMessage="No people registered yet"
      />
      {/* --- DEVICE ACCESS MODAL --- */}
      <Dialog open={deviceStatusOpen} onOpenChange={setDeviceStatusOpen}>
        <DialogContent className="max-w-md h-[520px] p-0 overflow-hidden flex flex-col">
          {/* HEADER */}
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="text-sm font-bold uppercase">
              Device Access : {deviceViewPerson?.employeeName}
            </DialogTitle>
          </DialogHeader>

          {/* :mag: SEARCH BAR */}
          <div className="p-3 border-b bg-muted/10">
            <input
              type="text"
              placeholder="Search device by name or SN..."
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-md outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* :clipboard: DEVICE LIST */}
          <div className="flex-1 overflow-y-auto">
            {/* :red_circle: IMPORTANT: prevent shrink */}
            <div className="min-h-full">
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {allDevices
                    .filter(
                      (dev) =>
                        (dev.name || "")
                          .toLowerCase()
                          .includes(deviceSearch.toLowerCase()) ||
                        (dev.serialNumber || "")
                          .toLowerCase()
                          .includes(deviceSearch.toLowerCase()),
                    )
                    .map((dev) => {
                      // LOG MATCH
                      const latestLog = deviceLogs?.find((l: any) => {
                        const lId = l.deviceId ?? l.device_id;
                        return Number(lId) === Number(dev.msId);
                      });

                      // ROLE MATCH
                      const isDoorAssigned =
                        ((deviceViewPerson as any)?.doorIds || [])?.includes(
                          Number(dev.msId),
                        ) ?? false;

                      // FINAL STATUS
                      const isUnblocked = latestLog
                        ? latestLog.type === "unblock"
                        : isDoorAssigned;

                      return (
                        <tr key={dev.id} className="hover:bg-muted/30">
                          {/* DEVICE INFO */}
                          <td className="p-3">
                            <p className="font-bold text-foreground">
                              {dev.name || "Unknown Device"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              SN: {dev.serialNumber || "N/A"}
                            </p>
                          </td>

                          {/* STATUS */}
                          <td className="p-3 text-center">
                            <Badge
                              variant={isUnblocked ? "outline" : "destructive"}
                              className={`text-[9px] font-bold px-2 ${isUnblocked
                                ? "border-green-500 text-green-600 bg-green-50"
                                : ""
                                }`}
                            >
                              {isUnblocked ? "ALLOWED" : "BLOCKED"}
                            </Badge>
                          </td>

                          {/* ACTION */}
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant={isUnblocked ? "destructive" : "outline"}
                              className="h-7 text-[10px] font-bold min-w-[80px]"
                              disabled={emergencyToggleMut.isPending}
                              onClick={() => {
                                emergencyToggleMut.mutate({
                                  employeeCode: deviceViewPerson?.employeeCode,
                                  deviceId: dev.msId,
                                  serialNumber: dev.serialNumber,
                                  action: isUnblocked ? "block" : "unblock",
                                });
                              }}
                            >
                              {emergencyToggleMut.isPending
                                ? "..."
                                : isUnblocked
                                  ? "BLOCK"
                                  : "UNBLOCK"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                  {/* :x: NO DATA */}
                  {allDevices.filter(
                    (dev) =>
                      (dev.name || "")
                        .toLowerCase()
                        .includes(deviceSearch.toLowerCase()) ||
                      (dev.serialNumber || "")
                        .toLowerCase()
                        .includes(deviceSearch.toLowerCase()),
                  ).length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center p-6 text-muted-foreground"
                        >
                          No devices found
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-2 text-[9px] text-center bg-muted/10 italic text-muted-foreground">
            Logs override the default Role settings.
          </div>
        </DialogContent>
      </Dialog>
      {(canAdd || canEdit) && (
      <CrudDialog
        open={dialogOpen}
        errors={fieldErrors}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
          setFieldErrors({});
        }}
        title={editing ? "Edit Person" : "Add Person"}
        // fields={fields}
        fields={filteredFields}
        initialData={
          editing
            ? {
              ...editing,
              departmentId: editing.departmentId
                ? String(editing.departmentId)
                : "",
              shiftId: editing.shiftId ? String(editing.shiftId) : "",
              designationId: editing.designationId
                ? String(editing.designationId)
                : "",
              companyId: editing.companyId ? String(editing.companyId) : "",
              locationId: editing.locationId
                ? String(editing.locationId)
                : "",
              riskTier: editing.riskTier ?? 1,
            }
            : {
              companyId: String(
                companies.find((c) => c.name.toLowerCase().includes("zim"))
                  ?.id || "",
              ),
              status: "active",
              personType: "employee",
            }
        }
        onSubmit={(data) => {
          // 🛡️ Reset errors
          setFieldErrors({});

          // 🛡️ XSS Validation
          const validationErrors = validateNoHtml(data);
          if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            return;
          }

          // 🔢 Convert numeric fields
          const numericFields = [
            "departmentId",
            "shiftId",
            "designationId",
            "companyId",
            "locationId",
            "riskTier",
          ];

          numericFields.forEach((k) => {
            if (data[k]) data[k] = Number(data[k]);
          });

          // 🚀 API Call
          if (editing) {
            updateMut.mutate({ id: editing.id, data });
          } else {
            createMut.mutate(data);
          }
        }}
        isPending={createMut.isPending || updateMut.isPending}
      />
      )}
      <Dialog open={roledialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {/* HEADER */}
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold leading-none">Assign Door</h2>
                <p className="text-blue-100 text-xs mt-1">
                  Assign doors to employee
                </p>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-4">
            {/* SEARCH */}
            <div className="relative">
              <input
                placeholder="Search door..."
                value={doorSearch}
                onChange={(e) => setDoorSearch(e.target.value)}
                className="w-full px-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">
                {selectedDoorIds.length} Selected
              </span>

              <div className="flex gap-3">
                <button
                  className="text-[11px] font-bold text-blue-600"
                  onClick={() => setSelectedDoorIds(doors.map((d) => d.id))}
                >
                  Select All
                </button>

                <button
                  className="text-[11px] font-bold text-slate-400"
                  onClick={() => setSelectedDoorIds([])}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* ROLE LIST */}
            <div className="h-[300px] overflow-y-auto rounded-xl border bg-slate-50 p-2">
              {isLoadingDoors ? (
                <p className="text-center text-sm text-muted-foreground">
                  Loading doors...
                </p>
              ) : (
                doors
                  ?.filter((d) =>
                    d.name.toLowerCase().includes(doorSearch.toLowerCase()),
                  )
                  .map((door) => (
                    <div
                      key={door.id}
                      className={`flex items-center gap-3 p-3 mb-1 rounded-lg transition-all cursor-pointer border ${selectedDoorIds.includes(door.id)
                        ? "bg-white border-blue-200 shadow-sm"
                        : "border-transparent hover:bg-white hover:border-slate-200"
                        }`}
                      onClick={() =>
                        setSelectedDoorIds((prev) => {
                          const safePrev = Array.isArray(prev) ? prev : [];

                          return safePrev.includes(door.id)
                            ? safePrev.filter((id) => id !== door.id)
                            : [...safePrev, door.id];
                        })
                      }
                    >
                      {/* ✅ CHECKBOX */}
                      {/* <Checkbox
                        checked={selectedDoorIds.includes(door.id)}
                        className="pointer-events-none"
                      /> */}
                      <Checkbox
                        checked={
                          Array.isArray(selectedDoorIds) &&
                          selectedDoorIds.includes(Number(door.id))
                        }
                        className="pointer-events-none"
                      />

                      {/* DOOR NAME */}
                      <span
                        className={`text-sm ${selectedDoorIds.includes(door.id)
                          ? "font-bold text-blue-700"
                          : "text-slate-600"
                          }`}
                      >
                        {door.name}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-4 bg-slate-50 border-t flex gap-3 justify-end">
            <Button
              variant="outline"
              className="rounded-xl px-6"
              onClick={() => {
                setRoleDialogOpen(false);
                setRoleAssign(null);
                setSelectedRoleId(null);
              }}
            >
              Cancel
            </Button>

            <Button
              className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                try {
                  const response = await apiRequest(
                    "POST",
                    "/api/employee-door-assignments",
                    {
                      employeeCode: roleassign?.employeeCode,
                      doorIds: selectedDoorIds,
                    },
                  );

                  if (response) {
                    // ✅ Shadcn style success notification
                    toast({
                      title: "Success",
                      description: "Doors assigned successfully!",
                      variant: "default", // Ya "success" agar aapne custom banaya hai
                    });

                    setRoleDialogOpen(false);
                    setRoleAssign(null);
                  }
                } catch (error) {
                  console.error("Assignment Error:", error);
                  // ❌ Shadcn style error notification
                  toast({
                    title: "Error",
                    description: "Failed to assign doors. Please try again.",
                    variant: "destructive", // Ye red color ka dikhega
                  });
                }
              }}
            >
              Assign Door
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
