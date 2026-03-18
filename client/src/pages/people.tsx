import { useState } from "react";
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
import type { Person, Department, Designation, Company, Category, Site, Role, Device } from "@shared/schema";
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
type RoleWithDevices = Role & {
  assignedDeviceNames?: string;
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
  const { data: people = [], isLoading, refetch, isFetching } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: designations = [] } = useQuery<Designation[]>({ queryKey: ["/api/designations"] });
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: roles = [] } = useQuery<RoleWithDevices[]>({ queryKey: ["/api/roles"] });
  const { data: allDevices = [] } = useQuery<Device[]>({ queryKey: ["/api/devices"] });
  const [deviceStatusOpen, setDeviceStatusOpen] = useState(false);
  const [deviceViewPerson, setDeviceViewPerson] = useState<Person | null>(null);
  const { data: deviceLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["/api/device-status", deviceViewPerson?.employeeCode],
    enabled: !!deviceViewPerson,
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/people/device-status/${deviceViewPerson?.employeeCode}`);
      return r.json();
    }
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
          // Agar pehle se logs hain, toh naye log ko purane ke saath merge karo
          // Agar same device ka log hai, toh use update kar do
          const newLog = response.data?.[0] || response.data; // Ensure we get the log object
          if (!oldData) return [newLog];

          const filtered = oldData.filter((l: any) => Number(l.deviceId) !== Number(newLog.deviceId));
          return [newLog, ...filtered];
        }
      );

      // 2. Background mein server se fresh data fetch karo
      queryClient.invalidateQueries({
        queryKey: ["/api/device-status", deviceViewPerson?.employeeCode]
      });
      refetchLogs(); // Force refetch
      toast({ title: "Updated" });
    },
    onError: (e: Error) => toast({ title: "Sync Error", description: e.message, variant: "destructive" }),
  });
  const createMut = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/people", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/people"] }); setDialogOpen(false); toast({ title: "Person created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const r = await apiRequest("PUT", `/api/people/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/people"] }); setDialogOpen(false); setEditing(null); toast({ title: "Person updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/people/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/people"] }); toast({ title: "Success", description: "Person deleted successfully." }); },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
  const createRoleAssign = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/employee-roles", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/people"] }); queryClient.invalidateQueries({ queryKey: ["/api/employee-roles"] }); setRoleDialogOpen(false); toast({ title: "Role assigned successfully" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateRoleAssign = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const r = await apiRequest("PUT", `/api/employee-roles/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employee-roles"] }); setRoleDialogOpen(false); setRoleAssign(null); toast({ title: "Role updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteRoleAssign = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/employee-roles/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/people"] }); setRoleDialogOpen(false); toast({ title: "Role removed", description: "Employee now has full device access." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const fields: FieldConfig[] = [
    { key: "employeeName", label: "Employee Name", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "employeeCode", label: "Employee Code", readOnly: !!editing, placeholder: editing ? "Cannot change code during edit" : "Enter unique employee code" } as any,
    { key: "personType", label: "Type", type: "select", options: Object.entries(personTypeLabels).map(([v, l]) => ({ value: v, label: l })), defaultValue: "employee" },
    { key: "gender", label: "Gender", type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }] },
    { key: "departmentId", label: "Department", type: "select", options: departments.map((d) => ({ value: String(d.id), label: d.name })) },
    { key: "designationId", label: "Designation", type: "select", options: designations.map((d) => ({ value: String(d.id), label: d.name })) },
    { key: "companyId", label: "Company", type: "select", options: companies.map((c) => ({ value: String(c.id), label: c.name })) },
    { key: "locationId", label: "Location", type: "select", options: sites.map((s) => ({ value: String(s.id), label: s.name })) }, { key: "dateOfJoining", label: "Date of Joining", type: "date" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "suspended", label: "Suspended" }], defaultValue: "active" },
    { key: "riskTier", label: "Risk Tier (1-5)", type: "number" },
  ];
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
  const rolefields = Array.from({ length: 1 }, () => {
    return [
      {
        key: "roleId",
        label: "Role Name",
        type: "select",
        // 1. Yahan "None" option add kiya gaya hai
        options: [
          { value: "0", label: "None / Remove Role" },
          ...(roles?.map((r: any) => ({ value: String(r.id), label: r.name })) || [])
        ],
        onChange: (val, currentForm, updateForm) => {
          // 2. Agar "0" select kiya hai toh devices ko clear kar dein
          if (val === "0" || !val) {
            updateForm({
              ...currentForm,
              roleId: "0",
              displayDevices: "No devices assigned (Role will be removed)"
            });
            return;
          }

          const selectedRole = roles.find((r: any) => String(r.id) === String(val));
          updateForm({
            ...currentForm,
            roleId: val,
            displayDevices: selectedRole?.assignedDeviceNames || "No devices assigned"
          });
        }
      },
      {
        key: "displayDevices",
        label: "Associated Devices",
        type: "text",
        readOnly: true,
        placeholder: "Select a role to see devices"
      },
    ] as FieldConfig[];
  })[0];
  const columns = [
    {
      key: "employeeName", label: "Name",
      render: (p: Person) => (
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">{(p.employeeName || "?")[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{p.employeeName}</p>
            <p className="text-xs text-muted-foreground truncate">{p.employeeCode || p.email || ""}</p>
          </div>
        </div>
      ),
    },
    { key: "employeeCode", label: "Emp Code", hideOnMobile: true },
    {
      key: "departmentId", label: "Department", hideOnMobile: true,
      render: (p: Person) => departments.find((d) => d.id === p.departmentId)?.name || "-",
    },
    {
      key: "roleName",
      label: "Role",
      hideOnMobile: true,
      render: (p: any) => (
        <span className={p.roleName ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
          {p.roleName || "No Role Assigned"}
        </span>
      )
    }, {
      key: "status", label: "Status",
      render: (p: Person) => <Badge variant={statusColors[p.status || "active"] as any}>{p.status}</Badge>,
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
              <TooltipContent><p>Device Access Status</p></TooltipContent>
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
              <TooltipContent><p>Assign Role</p></TooltipContent>
            </Tooltip>
            {/* Edit Action */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(p); setDialogOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Edit</p></TooltipContent>
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
                    if (window.confirm("Delete this person from all systems?")) {
                      deleteMut.mutate(p.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete</p></TooltipContent>
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
                  description: "The people list has been refreshed successfully."
                });
              } catch (error) {
                toast({
                  title: "Sync Failed",
                  description: "Could not refresh data. Please try again.",
                  variant: "destructive"
                });
              }
            }}
            disabled={isFetching}
            data-testid="button-sync-person"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
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
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="text-sm font-bold uppercase">
              Device Access: {deviceViewPerson?.employeeName}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[450px] overflow-y-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y">
                {allDevices.map((dev) => {
                  // 1. Logs matching (Checking both camelCase and snake_case)
                  const latestLog = deviceLogs?.find((l: any) => {
                    const lId = l.deviceId ?? l.device_id;
                    return Number(lId) === Number(dev.msId);
                  });

                  // 2. Role matching
                  const userRole = roles.find(r => r.id === deviceViewPerson?.roleId);
                  // Note: Check if deviceIds is an array or string
                  const isRoleAssigned = Array.isArray(userRole?.deviceIds)
                    ? userRole.deviceIds.includes(Number(dev.msId))
                    : false;

                  // 3. Status Priority (Log first, then Role)
                  const isUnblocked = latestLog
                    ? (latestLog.type === "unblock")
                    : isRoleAssigned;

                  // Debugging (Remove after fix)
                  // console.log(`Device: ${dev.name}, Log:`, latestLog, `Role: ${isRoleAssigned}`);

                  return (
                    <tr key={dev.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-bold text-foreground">{dev.name || "Unknown Device"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          SN: {dev.serialNumber || "N/A"}
                        </p>
                      </td>

                      <td className="p-3 text-center">
                        <Badge
                          variant={isUnblocked ? "outline" : "destructive"}
                          className={`text-[9px] font-bold px-2 ${isUnblocked ? 'border-green-500 text-green-600 bg-green-50' : ''}`}
                        >
                          {isUnblocked ? "ALLOWED" : "BLOCKED"}
                        </Badge>
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant={isUnblocked ? "destructive" : "outline"}
                          className="h-7 text-[10px] font-bold min-w-[80px]"
                          disabled={emergencyToggleMut.isPending}
                          onClick={() => {
                            // Important: Trigger mutation with latest UI state
                            emergencyToggleMut.mutate({
                              employeeCode: deviceViewPerson?.employeeCode,
                              deviceId: dev.msId,
                              serialNumber: dev.serialNumber,
                              action: isUnblocked ? "block" : "unblock"
                            });
                          }}
                        >
                          {emergencyToggleMut.isPending ? "..." : (isUnblocked ? "BLOCK" : "UNBLOCK")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-2 text-[9px] text-center bg-muted/10 italic text-muted-foreground">
            Logs override the default Role settings.
          </div>
        </DialogContent>
      </Dialog>
      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        title={editing ? "Edit Person" : "Add Person"}
        fields={fields}
        initialData={editing ? {
          ...editing,
          departmentId: editing.departmentId ? String(editing.departmentId) : "",
          designationId: editing.designationId ? String(editing.designationId) : "",
          companyId: editing.companyId ? String(editing.companyId) : "",
          locationId: editing.locationId ? String(editing.locationId) : "",
          riskTier: editing.riskTier ?? 1
        } : {
          companyId: String(companies.find(c => c.name.toLowerCase().includes("zim"))?.id || ""),
          status: "active",
          personType: "employee"
        }}
        onSubmit={(data) => {
          const numericFields = ["departmentId", "designationId", "companyId", "locationId", "riskTier"];
          numericFields.forEach(k => { if (data[k]) data[k] = Number(data[k]); });
          editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data);
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
            displayDevices: roleData?.assignedDeviceNames || "No devices assigned"
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
