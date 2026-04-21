import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pencil,
  Loader2,
  DoorOpen,
  Check,
  Settings2,
  ShieldCheck,
  Search,
  X,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function CronMasterPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("mainGate");
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isCabinModalOpen, setIsCabinModalOpen] = useState(false);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [isDoorModalOpen, setIsDoorModalOpen] = useState(false);

  // States for Door Selection
  const [selectedDoorIds, setSelectedDoorIds] = useState<number[]>([]);
  const [currentJobForDoors, setCurrentJobForDoors] = useState<any>(null);
  const [doorSearchQuery, setDoorSearchQuery] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // --- API SERVICES ---
  // Using 'refetch' instead of 'mutate' as per your use-crud hook structure
  const { data: gateJobs, refetch: refetchGate } = useCrud<any>(
    "/api/cron-jobs/main-gate",
    "Main Gate",
  );
  const { data: cabinJobs, refetch: refetchCabin } = useCrud<any>(
    "/api/cron-jobs/cabin-lock",
    "Cabin Lockout",
  );
  const {
    data: eligibleDoors,
    isLoading: isLoadingDoors,
    refetch: refetchDoors, // 👈 ye add karo
  } = useCrud<any>("/api/doors/lockout-eligible", "Eligible Doors");

  const { update: updateCronTask, isUpdating: isProcessing } = useCrud<any>(
    "/api/cron-lists",
    "Cron Manager",
  );

  const mainGateSyncJob = gateJobs?.[0];
  const cabinLockoutJob = cabinJobs?.[0];

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem("cron_active_tab");
    if (saved) setActiveTab(saved);
  }, []);

  useEffect(() => {
    if (isDoorModalOpen) {
      refetchDoors();
    }
  }, [isDoorModalOpen]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("cron_active_tab", value);
  };
  useEffect(() => {
    if (isDoorModalOpen && eligibleDoors) {
      // Jab modal khule, check karo ki DB se kounse true aa rahe hain
      const enabledOnes = eligibleDoors
        .filter((d: any) => d.is_lockout_enabled === true)
        .map((d: any) => d.id);

      setSelectedDoorIds(enabledOnes);
    }
  }, [isDoorModalOpen, eligibleDoors]);
  // --- CORE FUNCTIONS ---

  /**
   * 🚪 BULK DOOR UPDATE (Direct Table Update)
   * Calls: /api/doors/bulk-lockout
   */
  const handleAssignDoors = async () => {
    if (!currentJobForDoors || !eligibleDoors) return;

    // Logic: Sab IDs nikaalo aur unhe do groups mein baanto
    const allDoorIds = eligibleDoors.map((d: any) => d.id);
    const enabledIds = selectedDoorIds; // Jo checked hain
    const disabledIds = allDoorIds.filter(
      (id: number) => !selectedDoorIds.includes(id),
    ); // Jo checked nahi hain

    setIsBulkUpdating(true);
    try {
      // API Call
      const response = await fetch("/api/doors/bulk-lockout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledIds, disabledIds }),
      });

      // Cron Config Update (Taaki next time modal khule toh selections dikhein)
      await updateCronTask({
        id: currentJobForDoors.id,
        data: {
          config: {
            ...currentJobForDoors.config,
            assignedDoors: selectedDoorIds,
          },
        },
      });

      toast({ title: "Success", description: "Doors updated successfully!" });
      setIsDoorModalOpen(false);
      refetchCabin(); // Refresh table data
    } catch (error) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Sync failed.",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };
  /**
   * ⚙️ GENERIC CRON UPDATE (Gate or Cabin Settings)
   */
  const handleCronUpdate = async (type: "gate" | "cabin", payload: any) => {
    try {
      await updateCronTask({
        id: editingJob.id,
        data: payload,
      });

      // Refreshing specific list based on task type
      if (type === "gate") await refetchGate();
      else await refetchCabin();

      toast({
        title: "Updated",
        description: "Cron settings saved successfully.",
      });
      setIsGateModalOpen(false);
      setIsCabinModalOpen(false);
    } catch (error) {
      toast({
        title: "Update Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    }
  };

  // --- TABLE COLUMNS ---
  const gateColumns = [
    {
      key: "displayName",
      label: "Task Name",
      render: (row: any) => (
        <span className="font-bold text-slate-700">{row?.displayName}</span>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (row: any) => (
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
          {row?.code}
        </span>
      ),
    },
    {
      key: "scheduleSecond",
      label: "Scheduled Time",
      render: (row: any) => (
        <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
          {row?.scheduleSecond}s
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row?.isActive ? "outline" : "destructive"}
          className={
            row?.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : ""
          }
        >
          {row?.isActive ? "RUNNING" : "STOPPED"}
        </Badge>
      ),
    },
    {
      key: "lastRun",
      label: "Last Run",
      render: (row: any) => (
        <span className="text-xs text-slate-500">
          {row?.lastRun ? row.lastRun.split(".")[0].replace("T", " ") : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Action",
      render: (row: any) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditingJob(row);
            setIsGateModalOpen(true);
          }}
        >
          <Pencil className="w-4 h-4 text-slate-400" />
        </Button>
      ),
    },
  ];

  //   const cabinColumns = [
  //     {
  //       key: "displayName",
  //       label: "Task Name",
  //       render: (row: any) => (
  //         <span className="font-bold text-slate-700">{row?.displayName}</span>
  //       ),
  //     },
  //     {
  //       key: "code",
  //       label: "Code",
  //       render: (row: any) => (
  //         <span className="text-[11px] font-mono text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
  //           {row?.code}
  //         </span>
  //       ),
  //     },
  //     {
  //       key: "scheduleTime",
  //       label: "Scheduled Time",
  //       render: (row: any) => (
  //         <div className="text-xs font-semibold text-blue-600">
  //         {row?.scheduleSecond}s 
  //         </div>
  //       ),
  //     },
  //     {
  //       key: "status",
  //       label: "Status",
  //       render: (row: any) => (
  //         <Badge
  //           variant={row?.isActive ? "outline" : "destructive"}
  //           className={
  //             row?.isActive
  //               ? "bg-emerald-50 text-emerald-700 border-emerald-200"
  //               : ""
  //           }
  //         >
  //           {row?.isActive ? "ACTIVE" : "INACTIVE"}
  //         </Badge>
  //       ),
  //     },
  //     {
  //       key: "lastRun",
  //       label: "Last Run",
  //       render: (row: any) => (
  //         <span className="text-xs text-slate-500">
  //           {row?.lastRun ? row.lastRun.split(".")[0].replace("T", " ") : "Never"}
  //         </span>
  //       ),
  //     },
  //     // {
  //     //     key: "actions",
  //     //     label: "Action",
  //     //     render: (row: any) => (
  //     //         <div className="flex gap-1">
  //     //             <TooltipProvider>
  //     //                 <Tooltip>
  //     //                     <TooltipTrigger asChild>
  //     //                         <Button
  //     //                             size="icon"
  //     //                             variant="ghost"
  //     //                             className="hover:bg-blue-50"
  //     //                             onClick={() => {
  //     //                                 setCurrentJobForDoors(row);
  //     //                                 setSelectedDoorIds(row?.config?.assignedDoors || []);
  //     //                                 setIsDoorModalOpen(true);
  //     //                                 setDoorSearchQuery("");
  //     //                                 refetchDoors();
  //     //                             }}
  //     //                         >
  //     //                             <DoorOpen className="w-4 h-4 text-blue-500" />
  //     //                         </Button>
  //     //                     </TooltipTrigger>
  //     //                     <TooltipContent>Assign Doors</TooltipContent>
  //     //                 </Tooltip>
  //     //             </TooltipProvider>
  //     {
  //       key: "actions",
  //       label: "Action",
  //       render: (row: any) => (
  //         <div className="flex gap-1">
  //           <TooltipProvider>
  //             <Tooltip>
  //               <TooltipTrigger asChild>
  //                 <Button
  //                   size="icon"
  //                   variant="ghost"
  //                   className="hover:bg-blue-50"
  //                   onClick={async () => {
  //                     // 1. Refetch se result object lo
  //                     const result = await refetchDoors();

  //                     // 2. Result ke andar se data nikaalo (check karo ki data exist karta h)
  //                     const freshDoors = result.data;

  //                     // 3. Ab filter kaam karega
  //                     const preSelectedIds = freshDoors
  //                       ? freshDoors
  //                           .filter((d: any) => d.is_lockout_enabled === true)
  //                           .map((d: any) => d.id)
  //                       : [];

  //                     setCurrentJobForDoors(row);
  //                     setSelectedDoorIds(preSelectedIds);
  //                     setIsDoorModalOpen(true);
  //                     setDoorSearchQuery("");
  //                   }}
  //                 >
  //                   <DoorOpen className="w-4 h-4 text-blue-500" />
  //                 </Button>
  //               </TooltipTrigger>
  //               <TooltipContent>Assign Doors</TooltipContent>
  //             </Tooltip>
  //           </TooltipProvider>
  //           <Button
  //             size="icon"
  //             variant="ghost"
  //             onClick={() => {
  //               setEditingJob(row);
  //               setIsCabinModalOpen(true);
  //             }}
  //           >
  //             <Pencil className="w-4 h-4 text-slate-400" />
  //           </Button>
  //         </div>
  //       ),
  //     },
  //   ];
  const cabinColumns = [
    {
      key: "displayName",
      label: "Task Name",
      render: (row: any) => (
        <span className="font-bold text-slate-700">{row?.displayName}</span>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (row: any) => (
        <span className="text-[11px] font-mono text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
          {row?.code}
        </span>
      ),
    },
    // {
    //     // JSON data se lockoutHours aur lockoutMinutes nikaalna
    //     key: "lockoutDuration",
    //     label: "Lockout Duration",
    //     render: (row: any) => (
    //         <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50/50 px-2 py-1 rounded-md border border-orange-100 w-fit">
    //             <Clock className="w-3.5 h-3.5" />
    //             {/* Agar value 0 hai toh bhi 0 dikhayega */}
    //             <span>
    //                 {(row?.lockoutHours ?? 0)}h {(row?.lockoutMinutes ?? 0)}m
    //             </span>
    //         </div>
    //     ),
    // },
    //   {
    //     key: "status",
    //     label: "Status",
    //     render: (row: any) => (
    //       <Badge
    //         variant={row?.isActive ? "outline" : "destructive"}
    //         className={
    //           row?.isActive
    //             ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    //             : ""
    //         }
    //       >
    //         {row?.isActive ? "ACTIVE" : "INACTIVE"}
    //       </Badge>
    //     ),
    //   },
    //   {
    //     key: "lastRun",
    //     label: "Last Run",
    //     render: (row: any) => (
    //       <span className="text-xs text-slate-500">
    //         {/* Safe handling agar lastRun null ho (jaise aapke JSON mein hai) */}
    //         {row?.lastRun 
    //           ? row.lastRun.split(".")[0].replace("T", " ") 
    //           : "Never"}
    //       </span>
    //     ),
    //   },
    {
      key: "actions",
      label: "Action",
      render: (row: any) => (
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-blue-50"
                  onClick={async () => {
                    const result = await refetchDoors();
                    const freshDoors = result.data;
                    const preSelectedIds = freshDoors
                      ? freshDoors
                        .filter((d: any) => d.is_lockout_enabled === true)
                        .map((d: any) => d.id)
                      : [];

                    setCurrentJobForDoors(row);
                    setSelectedDoorIds(preSelectedIds);
                    setIsDoorModalOpen(true);
                    setDoorSearchQuery("");
                  }}
                >
                  <DoorOpen className="w-4 h-4 text-blue-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assign Doors</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                            setEditingJob(row);
                            setIsCabinModalOpen(true);
                        }}
                    >
                        <Pencil className="w-4 h-4 text-slate-400" />
                    </Button> */}
        </div>
      ),
    },
  ];
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative">
      {/* Global Loader Overlay */}
      {(isProcessing || isBulkUpdating) && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 border animate-in fade-in zoom-in duration-200">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="font-bold text-slate-700">Processing...</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Automation Hub"
        description="System-wide cron task orchestration and door lockout management."
      />

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="bg-slate-100 p-1 border shadow-sm">
          <TabsTrigger value="mainGate" className="gap-2 px-6">
            <Settings2 className="w-4 h-4" /> Gate Sync
          </TabsTrigger>
          <TabsTrigger value="cabin" className="gap-2 px-6">
            <ShieldCheck className="w-4 h-4" /> Cabin Lockout
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 border rounded-2xl bg-white shadow-sm overflow-hidden border-slate-200">
          <TabsContent value="mainGate" className="m-0">
            <DataTable
              columns={gateColumns}
              data={mainGateSyncJob ? [mainGateSyncJob] : []}
            />
          </TabsContent>
          <TabsContent value="cabin" className="m-0">
            <DataTable
              columns={cabinColumns}
              data={cabinLockoutJob ? [cabinLockoutJob] : []}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* DOOR ASSIGNMENT MODAL */}
      <Dialog open={isDoorModalOpen} onOpenChange={setIsDoorModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <DoorOpen className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold leading-none">
                  Assign Access Points
                </h2>
                <p className="text-blue-100 text-xs mt-1">
                  Bulk update door table status
                </p>
              </div>
            </div>
            {/*             <button onClick={() => setIsDoorModalOpen(false)}>
              <X className="w-5 h-5 opacity-70 hover:opacity-100 transition-opacity" />
            </button> */}
          </div>

          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                placeholder="Filter doors..."
                value={doorSearchQuery}
                onChange={(e) => setDoorSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm border-slate-200 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {selectedDoorIds.length} Selected
              </span>
              <div className="flex gap-4">
                <button
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                  onClick={() =>
                    setSelectedDoorIds(
                      eligibleDoors?.map((d: any) => d.id) || [],
                    )
                  }
                >
                  Select All
                </button>
                <button
                  className="text-[11px] font-bold text-slate-400 hover:underline"
                  onClick={() => setSelectedDoorIds([])}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="h-[300px] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2">
              {isLoadingDoors ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="animate-spin" />
                  <span className="text-xs">Fetching Doors...</span>
                </div>
              ) : (
                eligibleDoors
                  ?.filter((d: any) =>
                    d.name
                      .toLowerCase()
                      .includes(doorSearchQuery.toLowerCase()),
                  )
                  .map((door: any) => (
                    <div
                      key={door.id}
                      className={`flex items-center gap-3 p-3 mb-1 rounded-lg transition-all cursor-pointer border ${selectedDoorIds.includes(door.id) ? "bg-white border-blue-200 shadow-sm" : "border-transparent hover:bg-white hover:border-slate-200"}`}
                      onClick={() =>
                        setSelectedDoorIds((prev) =>
                          prev.includes(door.id)
                            ? prev.filter((id) => id !== door.id)
                            : [...prev, door.id],
                        )
                      }
                    >
                      <Checkbox
                        checked={selectedDoorIds.includes(door.id)}
                        className="pointer-events-none"
                      />
                      <span
                        className={`text-sm ${selectedDoorIds.includes(door.id) ? "font-bold text-blue-700" : "text-slate-600"}`}
                      >
                        {door.name}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t flex gap-3 justify-end">
            <Button
              variant="outline"
              className="rounded-xl px-6"
              onClick={() => setIsDoorModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700"
              onClick={handleAssignDoors}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Update Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CRON CONFIG DIALOGS */}
      <CrudDialog
        open={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        title="Sync Configuration"
        fields={[
          { key: "displayName", label: "Task Name", disabled: true },
          { key: "code", label: "Code", disabled: true },
          // Simple text field for Last Run
          { key: "lastRunDisplay", label: "Last Run", disabled: true },
          {
            key: "scheduleSecond",
            label: "Interval (Seconds)",
            type: "number",
            required: true,
          },
          { key: "isActive", label: "Enable Automation", type: "switch" },
        ]}
        initialData={
          editingJob
            ? {
              ...editingJob,
              lastRunDisplay: editingJob.lastRun
                ? editingJob.lastRun
                  .replace("T", " ")
                  .replace("Z", "")
                  .split(".")[0]
                : "Never",
            }
            : null
        }
        onSubmit={(val) =>
          handleCronUpdate("gate", {
            code: val.code,
            displayName: val.displayName,
            scheduleSecond: Number(val.scheduleSecond),
            isActive: val.isActive,
          })
        }
        isPending={isProcessing}
      />

      <CrudDialog
        open={isCabinModalOpen}
        onClose={() => setIsCabinModalOpen(false)}
        title="Policy Configuration"
        fields={[
          { key: "displayName", label: "Policy Name", disabled: true },
          { key: "code", label: "Code", disabled: true },
          // Simple text field for Last Run
          //   { key: "lastRunDisplay", label: "Last Run", disabled: true },
          //   { key: "scheduleHour", label: "Trigger Hour (0-23)", type: "number" },
          //   {
          //     key: "scheduleMinute",
          //     label: "Trigger Minute (0-59)",
          //     type: "number",
          //   },
          { key: "lockoutHours", label: "Duration Hours", type: "number" },
          { key: "lockoutMinutes", label: "Duration Minutes", type: "number" },
          //   { key: "isActive", label: "Enable Policy", type: "switch" },
        ]}
        initialData={
          editingJob
            ? {
              ...editingJob,
              lastRunDisplay: editingJob.lastRun
                ? editingJob.lastRun
                  .replace("T", " ")
                  .replace("Z", "")
                  .split(".")[0]
                : "Never",
            }
            : null
        }
        onSubmit={(val) =>
          handleCronUpdate("cabin", {
            code: val.code,
            displayName: val.displayName,
            scheduleHour: Number(val.scheduleHour),
            scheduleMinute: Number(val.scheduleMinute),
            lockoutHours: Number(val.lockoutHours),
            lockoutMinutes: Number(val.lockoutMinutes),
            isActive: val.isActive,
          })
        }
        isPending={isProcessing}
      />
    </div>
  );
}
