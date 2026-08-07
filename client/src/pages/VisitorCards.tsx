import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { usePermission } from "@/hooks/use-permission";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { validateNoHtml } from "@/lib/validation";
import { useConfirm } from "@/hooks/use-confirm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Pencil,
  Trash2,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  RotateCw,
  UserCheck,
  ShieldCheck,
  UserPlus,
  LogOut,
} from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { MAIN_GATE_SYNC, MENU_CONFIG } from "../../../server/constant";
import { PaginationSize } from "@/components/ui/pagination";
import { useQuery, useMutation } from "@tanstack/react-query";

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
import { formatDateTime } from "@/lib/utils";
const formatDateForInput = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export default function VisitorCardsPage() {
  const { canEdit, canDelete, canView } = usePermission(
    MENU_CONFIG.VISITOR_CARDS.code,
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleassign, setRoleAssign] = useState<Person | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [roledialogOpen, setRoleDialogOpen] = useState(false);
  const { toast } = useToast();
  const [deviceViewPerson, setDeviceViewPerson] = useState<Person | null>(null);
  const [deviceSearch, setDeviceSearch] = useState("");
  const { data: doors = [], isLoading: isLoadingDoors } = useQuery<any[]>({
    queryKey: ["/api/doors/active"],
  });
  const allDoors = doors || [];
  const { data: allDevices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });
  const { data: doorDevicesData = [] } = useQuery<any[]>({
    queryKey: ["/api/door-devices"],
  });
  const [deviceStatusOpen, setDeviceStatusOpen] = useState(false);
  const fetchVisitors = async () => {
    try {
      const res = await fetch(
        `/api/visitors?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
      );
      const data = await res.json();
      setPagedResponse(data);
    } catch (err) {
      // Silent catch
    }
  };
  const checkoutVisitor = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest("POST", `/api/visitors/${id}/checkout`, {});
      return r.json();
    },
    onSuccess: () => {
      fetchVisitors();
      toast({ title: "Visitor checked out successfully" });
    },
    onError: (e: Error) =>
      toast({
        title: "Checkout Error",
        description: e.message,
        variant: "destructive",
      }),
  });
  const { data: deviceLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["/api/device-status", deviceViewPerson?.employeeCode],
    enabled: !!deviceViewPerson && deviceStatusOpen, // Modal open ho aur person selected ho tabhi query active rahegi
    queryFn: async () => {
      const r = await apiRequest(
        "GET",
        `/api/people/device-status/${deviceViewPerson?.employeeCode}`,
      );
      return r.json();
    },
    refetchInterval: deviceStatusOpen ? 3000 : false, // Jab modal open hoga tab har 3 seconds (3000ms) me auto-refresh hoga
    refetchIntervalInBackground: false, // Background tab active hone par interval off rakhega (performance ke liye)
  });
  const emergencyToggleMut = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiRequest("POST", "/api/people/emergency-toggle", data);
      return r.json();
    },
    onSuccess: (response) => {
      queryClient.setQueryData(
        ["/api/device-status", deviceViewPerson?.employeeCode],
        (oldData: any) => {
          const newLog = response.data?.[0] || response.data;
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
      refetchLogs();
      toast({ title: "Updated" });
    },
    onError: (e: Error) =>
      toast({
        title: "Sync Error",
        description: e.message,
        variant: "destructive",
      }),
  });
  const statusColors: Record<string, string> = {
    active: "default",
    inactive: "secondary",
    suspended: "destructive",
  };
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Card Editing States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [whomToMeetSearch, setWhomToMeetSearch] = useState("");
  // Assign Visitor Dialog States
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<any>(null);
  const [selectedCardForAssign, setSelectedCardForAssign] = useState<any>(null);

  // Door Access / Device Status Modal States
  const [selectedDoorIds, setSelectedDoorIds] = useState<number[]>([]);
  const [selectedCardForDevice, setSelectedCardForDevice] = useState<any>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formKey, setFormKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [doorSearch, setDoorSearch] = useState("");
  const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);
  // CRUD Hooks for Visitor Cards
  const { isLoading, update, remove, isUpdating } = useCrud<any>(
    `/api/visitor-master`,
    "Visitor Card",
  ) as any;

  // CRUD Hooks for Visitors Registration
  const { create: createVisitor, update: updateVisitor } = useCrud<any>(
    `/api/visitors`,
    "Visitor",
  ) as any;

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/people");
      const resData = await res.json();
      return Array.isArray(resData) ? resData : resData?.data || [];
    },
  });

  const [pagedResponse, setPagedResponse] = useState<any>(null);
  const [visitorCards, setVisitorCards] = useState<any[]>([]);

  const fetchVisitorCards = async () => {
    try {
      const res = await fetch(
        `/api/visitor-master?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`, // 👈 Endpoint updated
      );
      const resData = await res.json();
      setPagedResponse(resData);
      if (Array.isArray(resData)) {
        setVisitorCards(resData);
      } else if (resData?.data) {
        setVisitorCards(resData.data);
      }
    } catch (error) {
      console.error("Fetcher execution broke:", error);
    }
  };

  useEffect(() => {
    fetchVisitorCards();
  }, [page, search, pageSize]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);

      const res = await fetch("/api/syncVisitors", {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("Sync operation failed");
      }

      const data = await res.json();

      // Table bina hile silent refresh karegi
      await fetchVisitorCards();

      toast({
        title: "Sync Successful",
        description: data.message || "Visitor cards synced successfully.",
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync visitors",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  const cardsData = Array.isArray(pagedResponse)
    ? pagedResponse
    : pagedResponse?.data || [];

  const totalCount = pagedResponse?.totalCount || cardsData.length || 0;
  const totalPages =
    pagedResponse?.totalPages || Math.ceil(totalCount / pageSize) || 1;

  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const copy = { ...prev };
      delete copy[fieldName];
      return copy;
    });
  };

  // 1. Visitor Card Fields Configuration
  const fields: FieldConfig[] = [
    { key: "name", label: "Card Code", required: true },
    {
      key: "cardNumber",
      label: "Card Number",
      required: true,
      disabled: !!editing,
    },
    { key: "expiryFrom", label: "Expiry From", type: "date" },
    { key: "expiryTo", label: "Expiry To", type: "date" },
  ];

  // 2. Visitor Form Fields
  const visitorFields: FieldConfig[] = [
    { key: "nameOfVisitor", label: "Visitor Name", required: true },
  {
  key: "contactNo",
  label: "Contact Number",
  type: "text",
  required: true,
  maxLength: 10,
  pattern: "^[0-9]*$", // Direct non-numeric entry block karega
},
    {
      key: "emailAddress",
      label: "Email Address",
      type: "email",
      onChange: (e: any) => {
        const val = e.target?.value?.trim() || "";
        if (!val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          clearFieldError("emailAddress");
        }
      },
    },
    { key: "visitorsCompanyName", label: "Company Name" },
    { key: "designation", label: "Designation" },
    {
      key: "whomToMeet",

      label: "Whom To Meet (ZIM Employee) *",

      type: "datalist" as any,

      placeholder: "Search Employee...",

      options: (employees || [])

        .map((e: any) => {
          const name = e.employee_name || e.employeeName || "";

          const code = e.employee_code || e.employeeCode || "";

          // Formatting: "Vishal (1)" or "Junaid (555)"

          const displayText = name && code ? `${name} (${code})` : name || code;

          return {
            label: displayText,

            value: displayText, // <--- Value me bhi same display text rakhein
          };
        })

        .filter((o: any) => o.value.trim() !== ""),

      onChange: (e: any) => {
        const val = e.target?.value || e;

        if (val && val !== "undefined" && val !== "null") {
          clearFieldError("whomToMeet");
        }
      },
    },

    { key: "purpose", label: "Purpose of Visit" },
    {
      key: "permissionDateFrom",
      label: "In Time *",
      type: "datetime-local" as any,
      onChange: (e: any) => {
        const val = e.target?.value?.trim() || "";
        if (val && val !== "undefined" && val !== "null") {
          clearFieldError("permissionDateFrom");
        }
      },
    },
    { key: "state", label: "State" },
    { key: "district", label: "District" },
    { key: "address1", label: "Address Line 1" },
    { key: "pincode", label: "Pincode" },
    { key: "remark", label: "Remark", type: "textarea" },
  ];

  // 3. Grid Columns
  const columns = [
    {
      key: "visitorname",
      label: "Visitor Name",
      render: (s: any) => <span className="font-medium">{s.visitorName}</span>,
    },
    {
      key: "name",
      label: "Card Code",
      render: (s: any) => <span className="font-medium">{s.employeeCode}</span>,
    },
    {
      key: "cardNumber",
      label: "Card Number",
      render: (s: any) => <span className="font-medium">{s.rfidCardNo}</span>,
    },
    // {
    //   key: "is_lockout_enabled",
    //   label: "Cabin Lockout",
    //   hideOnMobile: true,
    //   render: (s: any) => {
    //     const isEnabled = s.isLockoutEnabled;
    //     return (
    //       <Badge
    //         variant={isEnabled ? "destructive" : "outline"}
    //         className={`text-xs font-bold ${
    //           isEnabled
    //             ? "bg-red-50 text-red-600 border-red-300"
    //             : "bg-green-50 text-green-600 border-green-300"
    //         }`}
    //       >
    //         {isEnabled ? "ACTIVE" : "INACTIVE"}
    //       </Badge>
    //     );
    //   },
    // },
    {
      key: "is_lockout_enabled",
      label: "Cabin Lockout",
      hideOnMobile: true,
      render: (s: any) => {
        // isLockoutEnabled field se value pakdi (camelCase aur snake_case dono support ke sath)
        const isEnabled = Boolean(s.isLockoutEnabled ?? s.is_lockout_enabled);

        return (
          <Badge
            variant={isEnabled ? "destructive" : "outline"}
            className={`text-xs font-bold ${isEnabled
                ? "bg-red-50 text-red-600 border-red-300"     // Active = Red
                : "bg-green-50 text-green-600 border-green-300" // Inactive = Green
              }`}
          >
            {isEnabled ? "ACTIVE" : "INACTIVE"}
          </Badge>
        );
      },
    },
    {
      key: "currentAccessRule",
      label: "Current Rule",
      hideOnMobile: true,
      render: (s: any) => {
        const ruleId = s.ruleid ?? 0;
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
    {
      key: "lastDoorAccess",
      label: "Last Door Access",
      hideOnMobile: true,
      render: (s: any) => {
        if (!s.lastPunchDoorId) {
          return <span className="text-sm text-muted-foreground">Never</span>;
        }
        const formattedTime = new Date(s.updatedAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div className="text-sm">
            <div className="font-medium">{s.lastPunchDoorName}</div>
          </div>
        );
      },
    },

    {
      key: "isassign",
      label: "IsAssign",
      render: (s: any) => (
        <Badge variant={s.isAssigned ? "default" : "secondary"}>
          {s.isAssigned ? "Assigned" : "Not Assigned"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (s: any) => {
        return (
          <TooltipProvider delayDuration={100}>
            <div className="flex gap-1 items-center">
              {/* Assign Visitor Action Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Disabled button par tooltip work kare isliye span wrapper use kiya hai */}
                    <span className="inline-block">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={s.isAssigned} // 👈 Agar card assigned hai to disable ho jayega
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVisitor(null);
                          setSelectedCardForAssign(s);
                          setErrors({});
                          setVisitorDialog(true);
                        }}
                      >
                        <UserCheck
                          className={`w-4 h-4 ${
                            s.isAssigned ? "text-slate-400" : "text-green-600"
                          }`}
                        />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {s.isAssigned
                        ? "Card Currently Assigned"
                        : "Assign Visitor"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Device Access Status Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();

                        console.log("Selected Person Object (s):", s); // 🔍 Debugging ke liye console log

                        setSelectedCardForDevice(s);
                        setDeviceViewPerson(s); // 👈 YEH MISSING THA! Isko add karein.
                        setSelectedDoorIds([]); // Selection Reset
                        setDeviceStatusOpen(true);
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

              {/* Assign Door Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleAssign(s);
                        setRoleDialogOpen(true);
                      }}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Assign Door</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Edit Action Button */}
              {/* {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(s);
                        setFormKey((prev) => prev + 1);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit</p>
                  </TooltipContent>
                </Tooltip>
              )} */}
              {/* Check-out Action Button */}

              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      // 🔒 Enable tabhi hoga jab Card Assigned ho
                      disabled={checkoutVisitor.isPending || !s.isAssigned}
                      onClick={async (e) => {
                        e.stopPropagation();

                        // 🌟 GUARD 1: Agar card assigned hi nahi hai
                        if (!s.isAssigned) {
                          toast({
                            title: "Card Not Assigned",
                            description:
                              "This card is currently not assigned to any active visitor.",
                            variant: "destructive",
                          });
                          return;
                        }

                        const currentCardRfid = s.rfidCardNo || s.rfid_card_no;
                        const currentCardId = s.id;

                        let targetVisitorId = null;
                        let visitorName = "Visitor";

                        try {
                          // 🔍 API se direct latest active visitors list fetch karein
                          const res = await fetch("/api/visitors?pageSize=100");
                          const result = await res.json();
                          const allVisitors = Array.isArray(result)
                            ? result
                            : result.items || result.data || [];

                          // Target active visitor search
                          const activeVisitor = allVisitors.find((v: any) => {
                            const matchesCard =
                              (currentCardRfid &&
                                (v.rfidCardNo === currentCardRfid ||
                                  v.rfid_card_no === currentCardRfid)) ||
                              (v.visitorCardId &&
                                Number(v.visitorCardId) ===
                                  Number(currentCardId));

                            const isStillCheckedIn =
                              !v.permissionDateTo && !v.permission_date_to;

                            return matchesCard && isStillCheckedIn;
                          });

                          targetVisitorId =
                            activeVisitor?.id ||
                            s.activeVisitorId ||
                            s.visitorId;
                          if (
                            activeVisitor?.nameOfVisitor ||
                            activeVisitor?.name_of_visitor
                          ) {
                            visitorName =
                              activeVisitor.nameOfVisitor ||
                              activeVisitor.name_of_visitor;
                          }
                        } catch (err) {
                          console.error(
                            "Failed to fetch active visitor info:",
                            err,
                          );
                        }

                        // 🛑 Active record validation
                        if (!targetVisitorId) {
                          toast({
                            title: "Visitor Not Found",
                            description:
                              "Could not find an active checked-in visitor record for this card.",
                            variant: "destructive",
                          });
                          return;
                        }

                        // 🌟 CONFIRMATION DIALOG
                        const confirmed = await confirm({
                          title: "Mark Visitor Exit?",
                          description: `Are you sure you want to check out ${visitorName}? This will set their departure time.`,
                          confirmText: "Yes, Check-out",
                          cancelText: "Cancel",
                          variant: "default",
                        });

                        if (confirmed) {
                          // 🚀 Pass actual 'visitors' table primary ID (e.g., ID: 2)
                          checkoutVisitor.mutate(targetVisitorId, {
                            onSuccess: async () => {
                              toast({
                                title: "Visitor Checked Out",
                                description: `${visitorName} has been checked out successfully.`,
                              });

                              if (typeof fetchVisitorCards === "function") {
                                await fetchVisitorCards();
                              }
                            },
                          });
                        }
                      }}
                    >
                      <LogOut
                        className={`w-4 h-4 ${
                          !s.isAssigned
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : "text-emerald-500 hover:text-emerald-600"
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {!s.isAssigned ? "Not Assigned" : "Mark Exit / Check-out"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Delete Action Button */}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      // 🔒 Agar card assigned hai toh delete button disable rahega
                      disabled={s.isAssigned}
                      className={`hover:text-destructive ${
                        s.isAssigned
                          ? "text-muted-foreground/30 cursor-not-allowed"
                          : "text-red-500"
                      }`}
                      onClick={async (e) => {
                        e.stopPropagation();

                        // 🛑 GUARD: Agar card abhi kisi visitor ko assign hai
                        if (s.isAssigned) {
                          toast({
                            title: "Cannot Delete Card",
                            description: `Card "${s.name || s.cardNumber || s.id}" is currently assigned to a visitor. Please check out the visitor before deleting.`,
                            variant: "destructive",
                          });
                          return; // Delete process yahan ruk jayega
                        }

                        const confirmed = await confirm({
                          title: "Delete Visitor Card?",
                          description: `Are you sure you want to delete card "${s.name || s.cardNumber || s.id}"? This action cannot be undone.`,
                          confirmText: "Yes, Delete",
                          cancelText: "Cancel",
                          variant: "destructive",
                        });

                        if (!confirmed) return;

                        try {
                          await remove(s.id);
                          setPagedResponse((prev: any) => {
                            if (!prev) return prev;
                            if (Array.isArray(prev)) {
                              return prev.filter(
                                (item: any) => item.id !== s.id,
                              );
                            }
                            return {
                              ...prev,
                              data: prev.data
                                ? prev.data.filter(
                                    (item: any) => item.id !== s.id,
                                  )
                                : [],
                              totalCount: prev.totalCount
                                ? prev.totalCount - 1
                                : 0,
                            };
                          });
                          await fetchVisitorCards();
                          toast({
                            title: "Card Deleted",
                            description:
                              "Visitor card has been successfully deleted.",
                          });
                        } catch (err) {
                          console.error("Failed to delete card:", err);
                          toast({
                            title: "Delete Failed",
                            description: "Failed to delete visitor card.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {s.isAssigned ? "Cannot delete assigned card" : "Delete"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      },
    },
  ].filter((col) => {
    if (col.key === "actions") {
      return canEdit || canDelete;
    }
    return true;
  });

  const getPreparedInitialData = () => {
    if (!editing) return undefined;
    return {
      ...editing,
      expiryFrom: formatDateForInput(editing.expiryFrom),
      expiryTo: formatDateForInput(editing.expiryTo),
    };
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto [&_label.text-destructive]:text-foreground [&_input.border-destructive]:border-input [&_input.border-destructive]:focus-visible:ring-ring [&_td]:py-2 [&_th]:py-2">
      <PageHeader
        title="Visitor Cards"
        description="Manage RFID/Visitor cards and their expiry"
        action={
          <Button
            onClick={handleSync}
            disabled={isSyncing || isLoading}
            variant="default"
          >
            <RotateCw
              className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Cards"}
          </Button>
        }
      />

      <div className="relative max-w-sm mb-4">
        <input
          placeholder="Search cards..."
          value={search}
          onChange={(e) => {
            const cleanValue = e.target.value.replace(/^\/+/, "");
            setSearch(cleanValue);
            setPage(1);
          }}
          className="w-full h-9 border rounded-md pl-3 bg-background text-sm outline-none"
        />
      </div>

      <DataTable
        columns={columns}
        data={cardsData}
        isLoading={isLoading}
        searchable={false}
        pageSize={pageSize}
        emptyMessage="No visitor cards found."
      />

      {/* Pagination Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
        <div className="text-sm text-muted-foreground order-2 md:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, totalCount)}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalCount}</span>{" "}
          cards
        </div>

        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          <div className="flex items-center gap-2">
            <PaginationSize
              pageSize={pageSize}
              setPageSize={(val) => {
                setPageSize(val);
                setPage(1);
              }}
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Go to Page
            </span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= totalPages) setPage(val);
              }}
              className="w-12 h-8 text-center text-sm border rounded-md outline-none bg-background"
            />
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>

            <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
              {page} / {totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Visitor Card Dialog */}
      {canEdit && (
        <CrudDialog
          key={formKey}
          open={dialogOpen}
          errors={errors}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
            setErrors({});
          }}
          title="Edit Visitor Card"
          fields={fields}
          initialData={getPreparedInitialData()}
          onSubmit={async (formData) => {
            if (!canEdit) return;
            try {
              setErrors({});

              let validationErrors: Record<string, string> = {};

              const htmlTagErrors = validateNoHtml(formData);
              if (Object.keys(htmlTagErrors).length > 0) {
                validationErrors = { ...validationErrors, ...htmlTagErrors };
              }

              if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
              }

              const payload = {
                ...formData,
                location: formData.location ? Number(formData.location) : 0,
                expiryFrom: formData.expiryFrom
                  ? new Date(formData.expiryFrom)
                  : null,
                expiryTo: formData.expiryTo
                  ? new Date(formData.expiryTo)
                  : null,
              };

              await update({ id: editing.id, data: payload });
              await fetchVisitorCards();
              setDialogOpen(false);
              setEditing(null);
            } catch (err: any) {
              console.error("Operation failed details:", err);
              const errorMessage = err?.message || "";
              if (errorMessage.includes("Duplicate card number")) {
                setErrors({
                  cardNumber:
                    "This Card Number already exists. Duplicate not allowed.",
                });
              } else {
                setErrors({ general: errorMessage || "Operation failed" });
              }
            }
          }}
          isPending={isUpdating}
        />
      )}

      {/* Assign Visitor / Register Visitor Dialog */}
      <CrudDialog
        open={visitorDialog}
        errors={errors}
        onClose={() => {
          setVisitorDialog(false);
          setEditingVisitor(null);
          setSelectedCardForAssign(null);
          setErrors({});
        }}
        title={
          editingVisitor
            ? "Modify Visitor Profile"
            : selectedCardForAssign
              ? `Assign Visitor to Card (${selectedCardForAssign.name || selectedCardForAssign.cardNumber})`
              : "Register New Visitor"
        }
        fields={visitorFields}
        initialData={
          editingVisitor
            ? { ...editingVisitor }
            : selectedCardForAssign
              ? { visitorCardId: selectedCardForAssign.id }
              : undefined
        }
        onSubmit={async (data) => {
  setErrors({});

  const validationErrors = validateNoHtml(data) || {};

  const cleanedVisitorName = String(data.nameOfVisitor || "").trim();
  const cleanedContact = String(data.contactNo || "").trim();
  const cleanedEmail = String(data.emailAddress || "").trim();

  const selectedWhomToMeet = String(data.whomToMeet || "").trim();
  const selectedInTime = String(data.permissionDateFrom || "").trim();

  // 1. Visitor Name Check
  if (!cleanedVisitorName) {
    validationErrors.nameOfVisitor = "Visitor name is required.";
  }

  // 2. Whom To Meet Validation
  if (
    !selectedWhomToMeet ||
    selectedWhomToMeet === "undefined" ||
    selectedWhomToMeet === "null"
  ) {
    validationErrors.whomToMeet = "Please select the employee to meet.";
  }

  // 3. In Time Validation
  if (
    !selectedInTime ||
    selectedInTime === "undefined" ||
    selectedInTime === "null"
  ) {
    validationErrors.permissionDateFrom = "Please select the In Time.";
  }

  // 4. Contact Number Check (Simplified using RegEx)
  if (!cleanedContact) {
    validationErrors.contactNo = "Contact number is required.";
  } else if (!/^[6-9]\d{9}$/.test(cleanedContact)) {
    validationErrors.contactNo =
      "Enter a valid mobile number (must be 10 digits and start with 6, 7, 8, or 9).";
  }

  // Agar validationErrors me koi bhi keys hain to error state update karein
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

          // 5. Email Validation
          if (
            cleanedEmail &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)
          ) {
            validationErrors.emailAddress =
              "Please enter a valid email address.";
          }

          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }

          // 🚀 Extract Employee Code from "Name (Code)" string
          const rawWhomToMeet = String(data.whomToMeet || "").trim();
          const extractedCode =
            rawWhomToMeet.includes("(") && rawWhomToMeet.includes(")")
              ? rawWhomToMeet.match(/\(([^)]+)\)/)?.[1]?.trim() || rawWhomToMeet
              : rawWhomToMeet;

          // 🚀 Target Card Object
          const targetCard: any = selectedCardForAssign || editingVisitor;
          const cardId = Number(
            selectedCardForAssign?.id || data.visitorCardId,
          );
          const cardCode =
            targetCard?.employeeCode || targetCard?.employee_code || "";

          // 💳 Safe RFID Extraction from all possible sources & key names
          const cardRfidNo =
            data.rfidCardNo ||
            data.rfid_card_no ||
            targetCard?.rfidCardNo ||
            targetCard?.rfid_card_no ||
            targetCard?.cardNumber ||
            targetCard?.cardNo ||
            "";

          // 🚀 Payload setup (CamelCase & snake_case compatibility)
          const payload = {
            ...data,
            whomToMeet: extractedCode,
            visitorCardId: cardId,
            employeeCode: cardCode,
            rfidCardNo: String(cardRfidNo).trim(),
            rfid_card_no: String(cardRfidNo).trim(),
          };

          try {
            setIsSubmittingVisitor(true);

            const targetEndpoint = `/api/visitors?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`;

            const res = await fetch(targetEndpoint, {
              method: editingVisitor ? "PUT" : "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(
                errorData.message || "Failed to submit visitor details",
              );
            }

            toast({
              title: "Success",
              description: editingVisitor
                ? "Visitor details updated successfully."
                : "Visitor assigned successfully.",
            });

            setVisitorDialog(false);
            setEditingVisitor(null);
            setSelectedCardForAssign(null);

            await fetchVisitorCards();
          } catch (err: any) {
            console.error("Visitor operation failed:", err);
            setErrors({
              general: err?.message || "Failed to submit visitor details",
            });
            toast({
              title: "Error",
              description: err?.message || "Failed to submit visitor details",
              variant: "destructive",
            });
          } finally {
            setIsSubmittingVisitor(false);
          }
        }}
        isPending={isSubmittingVisitor}
      />

      {/* Door Access / Device Status Modal */}
      <Dialog open={deviceStatusOpen} onOpenChange={setDeviceStatusOpen}>
  {/* 💡 Compact Modal Container */}
  <DialogContent className="max-w-[450px] w-full h-[540px] p-0 overflow-hidden flex flex-col">
    {/* HEADER */}
    <DialogHeader className="px-4 py-3 border-b bg-muted/20">
      <DialogTitle className="text-xs font-bold uppercase tracking-wide">
        Door Access :{" "}
        {deviceViewPerson?.employeeName ||
          deviceViewPerson?.employeeCode ||
          0}
      </DialogTitle>
    </DialogHeader>

    {/* 🔍 SEARCH BAR */}
    <div className="p-2.5 border-b bg-muted/10">
      <input
        type="text"
        placeholder="Search door or device SN..."
        value={deviceSearch}
        onChange={(e) => setDeviceSearch(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border rounded-md outline-none focus:ring-1 focus:ring-primary"
      />
    </div>

    {/* 📋 DOORS LIST */}
    <div className="flex-1 overflow-y-auto">
      <div className="min-h-full">
        <table className="w-full text-xs">
          <tbody className="divide-y">
            {allDoors
              ?.filter(
                (door: any) =>
                  door.status === "active" || door.isActive !== false,
              )
              .map((door: any) => {
                // 1. /api/door-devices data mapping
                const mappedDoorDevice = (doorDevicesData || []).find(
                  (dd: any) => Number(dd.doorId) === Number(door.id),
                );

                // 2. Extract in & out IDs
                const inIds: number[] =
                  mappedDoorDevice?.inDeviceIds || door.inDeviceIds || [];
                const outIds: number[] =
                  mappedDoorDevice?.outDeviceIds ||
                  door.outDeviceIds ||
                  [];

                const associatedDeviceIds = Array.from(
                  new Set(
                    [...inIds, ...outIds]
                      .map((id) => Number(id))
                      .filter(Boolean),
                  ),
                );

                // 3. IN & OUT Devices List
                const inDevices = (allDevices || []).filter((d: any) =>
                  inIds.map(Number).includes(Number(d.msId ?? d.id)),
                );
                const outDevices = (allDevices || []).filter((d: any) =>
                  outIds.map(Number).includes(Number(d.msId ?? d.id)),
                );

                const assignedDevices =
                  allDevices?.filter((dev: any) => {
                    const devId = Number(dev.msId ?? dev.id);
                    return associatedDeviceIds.includes(devId);
                  }) || [];

                const inSNs = inDevices
                  .map((d: any) => d.serialNumber || d.sn || d.deviceSn)
                  .filter(Boolean);

                const outSNs = outDevices
                  .map((d: any) => d.serialNumber || d.sn || d.deviceSn)
                  .filter(Boolean);

                const allSerialNumbersCombined =
                  [...inSNs, ...outSNs].join(", ") || "N/A";

                // 4. Online Status check
                const isOnline =
                  assignedDevices.length > 0
                    ? assignedDevices.some(
                        (d: any) =>
                          d.status === "online" ||
                          d.isOnline === true ||
                          d.deviceStatus === "online",
                      )
                    : door.status === "online" || door.isOnline === true;

                // Priority Target Device IDs
                const targetDeviceIds = assignedDevices
                  .map((d: any) => Number(d.msId ?? d.id))
                  .filter(Boolean);

                // 5. Safety check for deviceLogs array
                const logsArray = Array.isArray(deviceLogs)
                  ? deviceLogs
                  : [];

                const latestLog = logsArray.find((l: any) => {
                  const lId = Number(l.deviceId);
                  return (
                    associatedDeviceIds.includes(lId) ||
                    targetDeviceIds.includes(lId)
                  );
                });

                const isDoorAssigned =
                  ((deviceViewPerson as any)?.doorIds || [])?.includes(
                    Number(door.id),
                  ) ?? false;

                const isUnblocked = latestLog
                  ? latestLog.type === "unblock" ||
                    latestLog.type === "Unblock User"
                  : isDoorAssigned;

                // Helper Function: MSSQL Command Status Badge
                const getDeviceCommandStatusBadge = (
                  deviceId: number,
                ) => {
                  if (!deviceId) return null;

                  const cmd = logsArray.find(
                    (c: any) => Number(c.deviceId) === Number(deviceId),
                  );

                  if (!cmd || !cmd.status) {
                    return (
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500"></span>
                    );
                  }

                  const statusUpper = String(cmd.status)
                    .trim()
                    .toUpperCase();

                  if (
                    statusUpper === "EXECUTED" ||
                    statusUpper === "SUCCESS" ||
                    statusUpper === "1"
                  ) {
                    return (
                      <span className="text-[8px] font-semibold font-mono px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200">
                        SUCCESS
                      </span>
                    );
                  } else if (
                    statusUpper === "PENDING" ||
                    statusUpper === "0"
                  ) {
                    return (
                      <span className="text-[8px] font-semibold font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200">
                        PENDING
                      </span>
                    );
                  } else {
                    return (
                      <span className="text-[8px] font-semibold font-mono px-1 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200">
                        {statusUpper || "FAILED"}
                      </span>
                    );
                  }
                };

                // Search filtering
                const query = deviceSearch.toLowerCase();
                const matchesSearch =
                  (door.name || "").toLowerCase().includes(query) ||
                  allSerialNumbersCombined.toLowerCase().includes(query);

                if (!matchesSearch) return null;

                return (
                  <tr key={door.id} className="hover:bg-muted/30">
                    <td className="p-2.5">
                      {/* Door Header */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isOnline ? "bg-green-500" : "bg-gray-300"
                          }`}
                          title={isOnline ? "Online" : "Offline"}
                        />
                        <p className="font-bold text-foreground text-xs truncate">
                          {door.name || "Unknown Door"}
                        </p>
                      </div>

                      {/* 📍 PERFECT GRID ALIGNMENT (Label | SN | Badge) */}
                      <div className="pl-3.5 flex flex-col gap-1 text-[10px] font-mono">
                        {/* IN DEVICES */}
                        {inDevices.map((dev: any, idx: number) => {
                          const sn =
                            dev.serialNumber || dev.sn || dev.deviceSn;
                          const devId = Number(dev.msId ?? dev.id);
                          return (
                            <div
                              key={`in-${idx}`}
                              className="grid grid-cols-[28px_110px_auto] items-center gap-1"
                            >
                              <span className="font-semibold text-emerald-600 bg-emerald-50 px-1 rounded text-[8px] text-center leading-tight w-max">
                                IN
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-300 text-[10px] truncate">
                                {sn}
                              </span>
                              <div className="flex items-center">
                                {getDeviceCommandStatusBadge(devId)}
                              </div>
                            </div>
                          );
                        })}

                        {/* OUT DEVICES */}
                        {outDevices.map((dev: any, idx: number) => {
                          const sn =
                            dev.serialNumber || dev.sn || dev.deviceSn;
                          const devId = Number(dev.msId ?? dev.id);
                          return (
                            <div
                              key={`out-${idx}`}
                              className="grid grid-cols-[28px_110px_auto] items-center gap-1"
                            >
                              <span className="font-semibold text-amber-600 bg-amber-50 px-1 rounded text-[8px] text-center leading-tight w-max">
                                OUT
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-300 text-[10px] truncate">
                                {sn}
                              </span>
                              <div className="flex items-center">
                                {getDeviceCommandStatusBadge(devId)}
                              </div>
                            </div>
                          );
                        })}

                        {inDevices.length === 0 &&
                          outDevices.length === 0 && (
                            <span className="italic text-gray-400 text-[10px]">
                              SN: N/A
                            </span>
                          )}
                      </div>
                    </td>

                    {/* STATUS COLUMN (Pure normal text, no border/background) */}
                    <td className="p-2 text-center align-middle">
                      {!isOnline ? (
                        <span className="text-[10px] font-bold text-slate-600">
                          OFFLINE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-700">
                          {isUnblocked ? "ALLOWED" : "BLOCKED"}
                        </span>
                      )}
                    </td>

                    {/* ACTION BUTTON COLUMN */}
                    <td className="p-2.5 text-right align-middle">
                      <Button
                        style={{ height: "22px", minHeight: "22px" }}
                        className={`w-[65px] text-[9px] font-bold px-0 py-0 flex items-center justify-center leading-none shadow-none border-0 text-white ${
                          isUnblocked
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                        disabled={
                          emergencyToggleMut.isPending ||
                          !isOnline ||
                          targetDeviceIds.length === 0
                        }
                        onClick={async () => {
                          const actionType = isUnblocked
                            ? "block"
                            : "unblock";

                          for (const devId of targetDeviceIds) {
                            const devObj = assignedDevices.find(
                              (d: any) =>
                                Number(d.msId ?? d.id) === Number(devId),
                            );

                            const singleSerialNumber =
                              devObj?.serialNumber ||
                              (devObj as any)?.sn ||
                              (devObj as any)?.deviceSn ||
                              "";

                            if (!singleSerialNumber) continue;

                            await emergencyToggleMut.mutateAsync({
                              employeeCode:
                                deviceViewPerson?.employeeCode,
                              deviceId: Number(devId),
                              serialNumber: singleSerialNumber.trim(),
                              action: actionType,
                            });
                          }

                          refetchLogs();
                        }}
                      >
                        {emergencyToggleMut.isPending
                          ? "..."
                          : !isOnline
                            ? "OFFLINE"
                            : isUnblocked
                              ? "BLOCK"
                              : "UNBLOCK"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>

    {/* FOOTER */}
    <div className="p-2 text-[9px] text-center bg-muted/10 italic text-muted-foreground border-t">
      Logs override the default Role settings.
    </div>
  </DialogContent>
</Dialog>

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
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                  onClick={() => setSelectedDoorIds(doors.map((d) => d.id))}
                >
                  Select All
                </button>

                {/* 🧹 Clear button: Reclaims Main Gate ID if present */}
                <button
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    const mainGate = doors.find(
                      (d) => d.code === MAIN_GATE_SYNC.CODE,
                    );
                    setSelectedDoorIds(mainGate ? [mainGate.id] : []);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* ROLE / DOOR LIST */}
            <div className="h-[300px] overflow-y-auto rounded-xl border bg-slate-50 p-2">
              {isLoadingDoors ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Loading doors...
                </p>
              ) : (
                doors
                  ?.filter((d) =>
                    d.name.toLowerCase().includes(doorSearch.toLowerCase()),
                  )
                  .map((door) => {
                    // 🔒 Check if current door is Main Gate
                    const isMainGate = door.code === MAIN_GATE_SYNC.CODE;
                    const isSelected = selectedDoorIds.includes(door.id);

                    return (
                      <div
                        key={door.id}
                        className={`flex items-center gap-3 p-3 mb-1 rounded-lg transition-all border ${
                          isMainGate
                            ? "bg-slate-100/80 border-slate-200 cursor-not-allowed opacity-90"
                            : isSelected
                              ? "bg-white border-blue-200 shadow-sm cursor-pointer"
                              : "border-transparent hover:bg-white hover:border-slate-200 cursor-pointer"
                        }`}
                        onClick={() => {
                          // ⛔ Main gate selection cannot be toggled
                          if (isMainGate) return;

                          setSelectedDoorIds((prev) => {
                            const safePrev = Array.isArray(prev) ? prev : [];
                            return safePrev.includes(door.id)
                              ? safePrev.filter((id) => id !== door.id)
                              : [...safePrev, door.id];
                          });
                        }}
                      >
                        {/* ✅ CHECKBOX */}
                        <Checkbox
                          checked={isMainGate || isSelected}
                          disabled={isMainGate}
                          className="pointer-events-none"
                        />

                        {/* DOOR NAME & BADGE */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-sm ${
                              isMainGate || isSelected
                                ? "font-bold text-blue-700"
                                : "text-slate-600"
                            }`}
                          >
                            {door.name}
                          </span>

                          {/* Optional indicator badge for Main Gate */}
                          {isMainGate && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
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
                  // 1. Main gate find karein
                  const mainGate = doors?.find(
                    (d) => d.code === MAIN_GATE_SYNC.CODE,
                  );

                  // 2. Ensure karein ki Main Gate ki ID final Payload mein ho
                  const finalDoorIds = Array.from(
                    new Set([
                      ...(selectedDoorIds || []),
                      ...(mainGate ? [mainGate.id] : []),
                    ]),
                  );

                  const response = await apiRequest(
                    "POST",
                    "/api/visitor-door-assignments",
                    {
                      employeeCode: roleassign?.employeeCode,
                      doorIds: finalDoorIds, // 👈 `selectedDoorIds` ki jagah `finalDoorIds` bhein
                    },
                  );

                  if (response) {
                    toast({
                      title: "Success",
                      description: "Doors assigned successfully!",
                      variant: "default",
                    });
                    setRoleDialogOpen(false);
                    setRoleAssign(null);
                  }
                } catch (error) {
                  console.error("Assignment Error:", error);
                  toast({
                    title: "Error",
                    description: "Failed to assign doors. Please try again.",
                    variant: "destructive",
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
