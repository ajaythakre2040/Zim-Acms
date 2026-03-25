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
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Loader2, DoorOpen, Check } from "lucide-react";
import { format } from "date-fns";

export default function DynamicCronDashboard() {
    const [activeTab, setActiveTab] = useState("mainGate");

    useEffect(() => {
        const savedTab = localStorage.getItem("activeTab");
        if (savedTab) setActiveTab(savedTab);
    }, []);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        localStorage.setItem("activeTab", val);
    };

    const [editing, setEditing] = useState<any>(null);
    const [cabinDialogOpen, setCabinDialogOpen] = useState(false);
    const [mainGateDialogOpen, setMainGateDialogOpen] = useState(false);

    // DOOR STATES
    const [doorDialogOpen, setDoorDialogOpen] = useState(false);
    const [selectedDoors, setSelectedDoors] = useState<number[]>([]);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [search, setSearch] = useState("");

    const {
        data: crons,
        update,
        isUpdating,
    } = useCrud<any>("/api/cron-lists", "Cron Master");

    const { data: doors, isLoading: doorsLoading } = useCrud<any>(
        "/api/doors",
        "Doors",
    );

    // STATIC FILTER
    const cabinData = crons?.find(
        (c: any) => c.displayName?.trim().toLowerCase() === "cabin lockout",
    );

    const mainGateData = crons?.find(
        (c: any) => c.displayName?.trim().toLowerCase() === "main gate - sync",
    );

    const filteredDoors = doors?.filter((d: any) =>
        d.name.toLowerCase().includes(search.toLowerCase()),
    );

    const toggleDoor = (id: number) => {
        setSelectedDoors((prev) =>
            prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
        );
    };

    const handleSelectAll = () => {
        if (filteredDoors) setSelectedDoors(filteredDoors.map((d: any) => d.id));
    };

    const handleClearAll = () => setSelectedDoors([]);

    // COMMON COLUMNS
    const baseColumns = [
        {
            key: "displayName",
            label: "Job Info",
            render: (i: any) => (
                <div>
                    <div className="font-semibold">{i?.displayName}</div>
                    <div className="text-xs text-blue-500">{i?.cronKey || i?.code}</div>
                </div>
            ),
        },
        {
            key: "scheduleTime",
            label: "Schedule",
            render: (i: any) => (
                <span className="text-xs">{i?.scheduleTime || 0}s</span>
            ),
        },
        {
            key: "executionStatus",
            label: "Status",
            render: (i: any) =>
                i?.isRunning ? (
                    <Badge className="bg-amber-100 text-amber-600">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Running
                    </Badge>
                ) : (
                    <Badge className="bg-green-100 text-green-600">
                        {i?.isActive ? "Ready" : "Paused"}
                    </Badge>
                ),
        },
        {
            key: "lastRun",
            label: "Last Run",
            render: (i: any) =>
                i?.lastRun ? format(new Date(i.lastRun), "HH:mm:ss") : "Never",
        },
    ];

    // MAIN GATE
    const mainGateColumns = [
        ...baseColumns,
        {
            key: "actions",
            label: "Actions",
            render: (i: any) => (
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                        setEditing({
                            ...i,
                            cronKey: i?.cronKey || i?.code,
                        });
                        setMainGateDialogOpen(true);
                    }}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
            ),
        },
    ];

    // CABIN
    const cabinColumns = [
        ...baseColumns,
        {
            key: "actions",
            label: "Actions",
            render: (i: any) => (
                <div className="flex gap-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                            setSelectedJob(i);
                            setSelectedDoors(i?.config?.assignedDoors || []);
                            setDoorDialogOpen(true);
                            setSearch("");
                        }}
                    >
                        <DoorOpen className="w-4 h-4" />
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                            setEditing({
                                ...i,
                                cronKey: i?.cronKey || i?.code,
                                scheduleMinutes: i?.config?.scheduleMinutes,
                                scheduleHours: i?.config?.scheduleHours,
                                lockoutMinutes: i?.config?.lockoutMinutes,
                                lockoutHours: i?.config?.lockoutHours,
                            });
                            setCabinDialogOpen(true);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6 space-y-6">
            <PageHeader title="Automation Hub" />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="mainGate">Main Gate Sync</TabsTrigger>
                    <TabsTrigger value="cabin">Cabin Lockout</TabsTrigger>
                </TabsList>

                <TabsContent value="mainGate">
                    <DataTable
                        columns={mainGateColumns}
                        data={mainGateData ? [mainGateData] : []}
                    />
                </TabsContent>

                <TabsContent value="cabin">
                    <DataTable
                        columns={cabinColumns}
                        data={cabinData ? [cabinData] : []}
                    />
                </TabsContent>
            </Tabs>

            {/* DOOR DIALOG */}
            <Dialog open={doorDialogOpen} onOpenChange={setDoorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Doors</DialogTitle>
                    </DialogHeader>

                    <input
                        placeholder="Search door..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full p-2 border rounded mt-2"
                    />

                    <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={handleSelectAll}>
                            Select All
                        </Button>

                        <Button size="sm" variant="outline" onClick={handleClearAll}>
                            Clear
                        </Button>
                    </div>

                    <div className="h-[300px] overflow-y-auto mt-2 border rounded">
                        {doorsLoading ? (
                            <Loader2 className="animate-spin mx-auto" />
                        ) : (
                            filteredDoors?.map((door: any) => (
                                <div
                                    key={door.id}
                                    className="flex items-center gap-2 p-2 cursor-pointer"
                                    onClick={() => toggleDoor(door.id)}
                                >
                                    <Checkbox checked={selectedDoors.includes(door.id)} />
                                    <span>{door.name}</span>
                                    {selectedDoors.includes(door.id) && (
                                        <Check className="ml-auto w-4 h-4 text-blue-600" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setDoorDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                await update({
                                    id: selectedJob.id,
                                    data: {
                                        ...selectedJob,
                                        config: {
                                            ...selectedJob.config,
                                            assignedDoors: selectedDoors,
                                        },
                                    },
                                });
                                setDoorDialogOpen(false);
                            }}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MAIN GATE EDIT */}
            <CrudDialog
                open={mainGateDialogOpen}
                onClose={() => {
                    setMainGateDialogOpen(false);
                    setEditing(null);
                }}
                title="Main Gate Config"
                fields={[
                    { key: "displayName", label: "Job Name", disabled: true },
                    { key: "cronKey", label: "Code", disabled: true },
                    { key: "scheduleTime", label: "Interval", type: "number" },
                    { key: "isActive", label: "Enabled", type: "switch" },
                ]}
                initialData={editing}
                onSubmit={async (val) => {
                    await update({ id: editing.id, data: val });
                    setMainGateDialogOpen(false);
                }}
                isPending={isUpdating}
            />

            {/* CABIN EDIT */}
            <CrudDialog
                open={cabinDialogOpen}
                onClose={() => {
                    setCabinDialogOpen(false);
                    setEditing(null);
                }}
                title="Cabin Lockout Config"
                fields={[
                    { key: "displayName", label: "Job Name", disabled: true },
                    { key: "cronKey", label: "Code", disabled: true },
                    { key: "scheduleHours", label: "Schedule Hours", type: "number" },
                    { key: "scheduleMinutes", label: "Schedule Minutes", type: "number" },
                    { key: "lockoutHours", label: "Lockout Hours", type: "number" },
                    { key: "lockoutMinutes", label: "Lockout Minutes", type: "number" },
                    { key: "isActive", label: "Enabled", type: "switch" },
                ]}
                initialData={editing}
                onSubmit={async (val) => {
                    await update({
                        id: editing.id,
                        data: {
                            ...editing,
                            config: {
                                ...editing.config,
                                scheduleHours: val.scheduleHours,
                                scheduleMinutes: val.scheduleMinutes,
                                lockoutHours: val.lockoutHours,
                                lockoutMinutes: val.lockoutMinutes,
                            },
                        },
                    });
                    setCabinDialogOpen(false);
                }}
                isPending={isUpdating}
            />
        </div>
    );
}
