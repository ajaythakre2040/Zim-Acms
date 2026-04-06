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
import { RefreshCw, Pencil, Eye, Trash2, UserPlus } from "lucide-react";
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
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roledialogOpen, setRoleDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [roleassign, setRoleAssign] = useState<Person | null>(null);
  const { toast } = useToast();
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
  const { data: roles = [] } = useQuery<RoleWithDoors[]>({
    queryKey: ["/api/roles"],
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
          // Agar pehle se logs hain, toh naye log ko purane ke saath merge karo
          // Agar same device ka log hai, toh use update kar do
          const newLog = response.data?.[0] || response.data; // Ensure we get the log object
          if (!oldData) return [newLog];

          const filtered = oldData.filter(
            (l: any) => Number(l.deviceId) !== Number(newLog.deviceId),
          );
          return [newLog, ...filtered];
        },
      );

      // 2. Background mein server se fresh data fetch karo
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
  const createRoleAssign = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiRequest("POST", "/api/employee-roles", data);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-roles"] });
      setRoleDialogOpen(false);
      toast({ title: "Role assigned successfully" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateRoleAssign = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await apiRequest("PUT", `/api/employee-roles/${id}`, data);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-roles"] });
      setRoleDialogOpen(false);
      setRoleAssign(null);
      toast({ title: "Role updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteRoleAssign = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employee-roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setRoleDialogOpen(false);
      toast({
        title: "Role removed",
        description: "Employee now has full device access.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const fields: FieldConfig[] = [
    { key: "employeeName", label: "Employee Name", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    {
      key: "employeeCode",
      label: "Employee Code",
      readOnly: !!editing,
      placeholder: editing
        ? "Cannot change code during edit"
        : "Enter unique employee code",
    } as any,
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
    // Department Dropdown
    {
      key: "departmentId",
      label: "Department",
      type: "select",
      options: departments.map((d) => ({ value: String(d.id), label: d.name })),
    },

    // Shift Dropdown
    {
      key: "shiftId",
      label: "Shift",
      type: "select",
      options: shifts.map((s: any) => ({
        value: String(s.id),
        label: s.name || s.code || `Shift ${s.id}`,
      })),
    },
    // { key: "departmentId", label: "Department", type: "select", options: departments.map((d) => ({ value: String(d.id), label: d.name })) },
    {
      key: "designationId",
      label: "Designation",
      type: "select",
      options: designations.map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    },
    {
      key: "companyId",
      label: "Company",
      type: "select",
      options: companies.map((c) => ({ value: String(c.id), label: c.name })),
    },
    {
      key: "locationId",
      label: "Location",
      type: "select",
      options: sites.map((s) => ({ value: String(s.id), label: s.name })),
    },
    { key: "dateOfJoining", label: "Date of Joining", type: "date" },
    {
      key: "lastSeenTime",
      label: "Last Seen",
      type: "text",
      readOnly: true,
      placeholder: "Auto-generated from logs",
    },
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
  const hiddenOnEdit = ["designationId", "companyId", "riskTier"];

  const filteredFields = fields.filter(
    (f) => !(editing && hiddenOnEdit.includes(f.key)),
  );
  // const rolefields = Array.from({ length: 1 }, () => {
  //   return [
  //     {
  //       key: "roleId",
  //       label: "Role Name",
  //       type: "select",
  //       options: roles?.map((r: any) => ({ value: String(r.id), label: r.name })) || [],
  //       onChange: (val, currentForm, updateForm) => {
  //         const selectedRole = roles.find((r: any) => String(r.id) === String(val));
  //         updateForm({
  //           ...currentForm,
  //           roleId: val,
  //           displayDevices: selectedRole?.assignedDeviceNames || "No devices assigned"
  //         });
  //       }
  //     },
  //     {
  //       key: "displayDevices",
  //       label: "Associated Devices",
  //       type: "text",
  //       readOnly: true,
  //       placeholder: "Select a role to see devices"
  //     },
  //   ] as FieldConfig[];
  // })[0];
  const rolefields = [
    {
      key: "roleId",
      label: "Role Name",
      type: "select",
      options: [
        { value: "0", label: "None / Remove Role" },
        ...(roles?.map((r: any) => ({
          value: String(r.id),
          label: r.name,
        })) || []),
      ],
      onChange: (val, currentForm, updateForm) => {
        if (val === "0" || !val) {
          updateForm({
            ...currentForm,
            roleId: "0",
            displayDoors: "No doors assigned (Role will be removed)",
          });
          return;
        }

        const selectedRole = roles.find(
          (r: any) => String(r.id) === String(val),
        );

        updateForm({
          ...currentForm,
          roleId: val,
          displayDoors: selectedRole?.assignedDoorNames || "No doors assigned",
        });
      },
    },
    {
      key: "displayDoors",
      label: "Associated Doors",
      type: "text",
      readOnly: true,
      placeholder: "Select a role to see doors",
    },
  ] as FieldConfig[];
  // })[0];
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
            {/* <p className="text-xs text-muted-foreground truncate">{p.employeeCode || p.email || ""}</p> */}
          </div>
        </div>
      ),
    },
    { key: "employeeCode", label: "Emp Code", hideOnMobile: true },
    {
      key: "departmentId",
      label: "Department",
      hideOnMobile: true,
      render: (p: Person) =>
        departments.find((d) => d.id === p.departmentId)?.name || "-",
    },
    {
      key: "roleName",
      label: "Role",
      hideOnMobile: true,
      render: (p: any) => (
        <span
          className={
            p.roleName
              ? "text-sm text-foreground"
              : "text-sm text-muted-foreground"
          }
        >
          {p.roleName || "No Role Assigned"}
        </span>
      ),
    },

    // ==================== CURRENT RULE (Simple) ====================
    {
      key: "currentAccessRule",
      label: "Current Rule",
      hideOnMobile: true,
      render: (p: any) => {
        // Backend JSON mein 'ruleid' small letters mein hai
        const ruleId = p.ruleid ?? 0;

        const ruleNames: Record<number, string> = {
          0: "No Rule Assigned",
          1: "Main Gate Entry",
          2: "Cabin Entry",
          3: "Cabin Exit",
          4: "Lockout Active",
          5: "Main Gate Exit",
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
        // Agar lastPunchDoorId null hai toh "Never" dikhayenge
        if (!p.lastPunchDoorId) {
          return <span className="text-sm text-muted-foreground">Never</span>;
        }

        // Door ID ke saath timestamp (updatedAt use kar rahe hain kyunki punch ke baad update hua hoga)
        const formattedTime = new Date(p.updatedAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div className="text-sm">
            <div className="font-medium">Door: {p.lastPunchDoorId}</div>
            {/* <div className="text-xs text-muted-foreground">{formattedTime}</div> */}
          </div>
        );
      },
    },
    {
      key: "lastSeenTime",
      label: "Last Seen",
      hideOnMobile: true,
      render: (p: any) => {
        const timestamp = p.lastSeenTime;

        if (!timestamp) {
          return (
            <span className="text-sm text-muted-foreground">
              No Logs
            </span>
          );
        }

        // ✅ Proper timezone handling (IST)
        const formattedTime = new Date(timestamp).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata", // 🔥 important fix
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        return (
          <div className="text-sm">
            <span className="font-medium text-foreground">
              {formattedTime}
            </span>

            {p.currentZone && (
              <div className="text-[10px] text-blue-600 font-bold uppercase">
                Zone: {p.currentZone}
              </div>
            )}
          </div>
        );
      },
    },
    // status column ke upar...
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
                  <Eye className="w-4 h-4 text-blue-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Device Access Status</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRoleAssign(p);
                    setSelectedRoleId(p.roleId ? String(p.roleId) : null);
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
            {/* Edit Action */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(p);
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
          </div>
        </TooltipProvider>
      ),
    },
  ];
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="People"
        description="Manage employees, contractors, and personnel"
        action={
          <Button
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
                  description: "Could not refresh data. Please try again.",
                  variant: "destructive",
                });
              }
            }}
            disabled={isFetching}
            data-testid="button-sync-person"
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Syncing..." : "Sync"}
          </Button>
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
                      const userRole = roles.find(
                        (r) => r.id === deviceViewPerson?.roleId,
                      );

                      const isRoleAssigned = Array.isArray(userRole?.doorIds)
                        ? userRole.doorIds.includes(Number(dev.msId))
                        : false;

                      // FINAL STATUS
                      const isUnblocked = latestLog
                        ? latestLog.type === "unblock"
                        : isRoleAssigned;

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

      <CrudDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
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
          editing
            ? updateMut.mutate({ id: editing.id, data })
            : createMut.mutate(data);
        }}
        isPending={createMut.isPending || updateMut.isPending}
      />
      <CrudDialog
        open={roledialogOpen}
        onClose={() => {
          setRoleDialogOpen(false);
          setRoleAssign(null);
          setSelectedRoleId(null);
        }}
        title="Assign Role"
        fields={rolefields}
        initialData={(() => {
          if (!roleassign) return {};
          const currentId = selectedRoleId || String(roleassign.roleId || "");
          const roleData = roles.find((r: any) => String(r.id) === currentId);
          return {
            ...roleassign,
            roleId: currentId,
            displayDoors: roleData?.assignedDoorNames || "No doors assigned",
          };
        })()}
        onSubmit={(data) => {
          createRoleAssign.mutate({
            employeeCode: roleassign?.employeeCode,
            roleId: Number(data.roleId),
          });
        }}
        isPending={createRoleAssign.isPending}
      />
    </div>
  );
}
