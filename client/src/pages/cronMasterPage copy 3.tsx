import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
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
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Settings2, Loader2, DoorOpen, Check } from "lucide-react";
import { format } from "date-fns";

export default function DynamicCronDashboard() {
    const [activeTab, setActiveTab] = useState("master");

    useEffect(() => {
        const savedTab = localStorage.getItem("activeTab");
        if (savedTab) setActiveTab(savedTab);
    }, []);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        localStorage.setItem("activeTab", val);
    };

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const [doorDialogOpen, setDoorDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [selectedDoors, setSelectedDoors] = useState<number[]>([]);

    // ✅ SEARCH STATE
    const [search, setSearch] = useState("");

    const {
        data: crons,
        create,
        update,
        isCreating,
        isUpdating,
    } = useCrud<any>("/api/cron-jobs", "Cron Master");

    const { data: doors, isLoading: doorsLoading } = useCrud<any>(
        "/api/doors",
        "Doors",
    );

    // ✅ FILTER DOORS
    const filteredDoors = doors?.filter((d: any) =>
        d.name.toLowerCase().includes(search.toLowerCase()),
    );

    // DOOR HANDLERS
    const toggleDoor = (id: number) => {
        setSelectedDoors((prev) =>
            prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
        );
    };

    // ✅ SELECT ALL FILTERED
    const handleSelectAll = () => {
        if (filteredDoors) setSelectedDoors(filteredDoors.map((d: any) => d.id));
    };

    const handleClearAll = () => setSelectedDoors([]);
    const [cabinDialogOpen, setCabinDialogOpen] = useState(false);
    // TABLE COLUMNS
    const masterColumns = [
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
            render: (i: any) => <span className="text-xs">{i?.scheduleTime}s</span>,
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
                            cronKey: i.cronKey || i.code || "",
                        });
                        setDialogOpen(true);
                    }}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
            ),
        },
    ];

    const cabinColumns = masterColumns.map((col) => {
        if (col.key === "actions") {
            return {
                ...col,
                render: (i: any) => (
                    <div className="flex gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                                setSelectedJob(i);
                                setSelectedDoors(i.config?.assignedDoors || []);
                                setDoorDialogOpen(true);
                                setSearch(""); // reset search
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
                                    cronKey: i.cronKey || i.code || "",
                                    scheduleMinutes: i?.config?.scheduleMinutes,
                                    scheduleHours: i?.config?.scheduleHours,
                                    lockoutMinutes: i?.config?.lockoutMinutes,
                                    lockoutHours: i?.config?.lockoutHours,
                                });
                                setCabinDialogOpen(true); // ✅ NEW DIALOG
                            }}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                    </div>
                ),
            };
        }
        return col;
    });

    const fields: FieldConfig[] = [
        {
            key: "displayName",
            label: "Job Name",
            required: true,
            disabled: !!editing,
        },
        { key: "cronKey", label: "Code", required: true, disabled: !!editing },
        {
            key: "scheduleTime",
            label: "Interval (Sec)",
            type: "number",
            required: true,
        },
        { key: "isActive", label: "Enabled", type: "switch", defaultValue: true },
    ];

    const cabinFields: FieldConfig[] = [
        {
            key: "displayName",
            label: "Job Name",
            required: true,
            disabled: !!editing,
        },
        {
            key: "cronKey",
            label: "Code",
            required: true,
            disabled: !!editing,
        },

        // ✅ ROW 1 → Scheduled (Hours + Minutes)
        {
            key: "scheduleHours",
            label: "Scheduled Hours",
            type: "number",
            className: "w-1/2 inline-block pr-2",
        },
        {
            key: "scheduleMinutes",
            label: "Scheduled Minutes",
            type: "number",
            className: "w-1/2 inline-block pl-2",
        },

        // ✅ ROW 2 → Lockout (Hours + Minutes)
        {
            key: "lockoutHours",
            label: "Lockout Hours",
            type: "number",
            className: "w-1/2 inline-block pr-2",
        },
        {
            key: "lockoutMinutes",
            label: "Lockout Minutes",
            type: "number",
            className: "w-1/2 inline-block pl-2",
        },

        {
            key: "isActive",
            label: "Enabled",
            type: "switch",
            defaultValue: true,
        },
    ];

    const mainGateData = crons?.find((c: any) =>
        c.displayName.toLowerCase().includes("gate"),
    );

    return (
        <div className="p-6 space-y-6">
            <PageHeader title="Automation Hub" />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="master">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Master Control
                    </TabsTrigger>

                    {crons?.map((cron: any) => (
                        <TabsTrigger
                            key={cron.id}
                            value={`log-${cron.cronKey || cron.code}`}
                        >
                            {cron.displayName}
                        </TabsTrigger>
                    ))}

                    <TabsTrigger value="log-cabin-lockout">Cabin Lockout</TabsTrigger>
                </TabsList>

                <TabsContent value="master">
                    <DataTable columns={masterColumns} data={crons || []} />
                </TabsContent>

                {crons?.map((cron: any) => (
                    <TabsContent key={cron.id} value={`log-${cron.cronKey || cron.code}`}>
                        <DataTable columns={masterColumns} data={[cron]} />
                    </TabsContent>
                ))}

                <TabsContent value="log-cabin-lockout">
                    <DataTable
                        columns={cabinColumns}
                        data={mainGateData ? [mainGateData] : []}
                    />
                </TabsContent>
            </Tabs>

            {/* ASSIGN DOOR DIALOG */}
            <Dialog open={doorDialogOpen} onOpenChange={setDoorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex gap-2 items-center">
                            <DoorOpen className="w-5 h-5 text-blue-600" />
                            Assign Doors
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex justify-between text-xs mt-2">
                        <span>{selectedDoors.length} Selected</span>

                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSelectAll}>
                                Select All
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleClearAll}>
                                Clear
                            </Button>
                        </div>
                    </div>

                    {/* 🔍 SEARCH INPUT */}
                    <input
                        type="text"
                        placeholder="Search door..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full mt-2 p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="max-h-[300px] overflow-y-auto mt-2 border p-2 rounded">
                        {doorsLoading ? (
                            <Loader2 className="animate-spin mx-auto" />
                        ) : (
                            filteredDoors?.map((door: any) => (
                                <div
                                    key={door.id}
                                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded"
                                    onClick={() => toggleDoor(door.id)}
                                >
                                    <Checkbox checked={selectedDoors.includes(door.id)} />
                                    <span>{door.name}</span>
                                    {selectedDoors.includes(door.id) && (
                                        <Check className="w-4 h-4 text-blue-600 ml-auto" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDoorDialogOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            disabled={isUpdating}
                            onClick={async () => {
                                const { lastRun, ...rest } = selectedJob;

                                await update({
                                    id: selectedJob.id,
                                    data: {
                                        ...rest,
                                        config: {
                                            ...selectedJob.config,
                                            assignedDoors: selectedDoors,
                                        },
                                    },
                                });

                                setDoorDialogOpen(false);
                            }}
                        >
                            {isUpdating ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CRUD */}
            <CrudDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                    setEditing(null);
                }}
                title="Update Job"
                fields={fields}
                initialData={{
                    ...editing,
                    cronKey: editing?.cronKey || editing?.code || "",
                }}
                onSubmit={async (val) => {
                    const { lastRun, ...data } = val;

                    editing ? await update({ id: editing.id, data }) : await create(data);

                    setDialogOpen(false);
                }}
                isPending={isCreating || isUpdating}
            />

            <CrudDialog
                open={cabinDialogOpen}
                onClose={() => {
                    setCabinDialogOpen(false);
                    setEditing(null);
                }}
                title="Cabin Lockout Config"
                fields={cabinFields}
                initialData={editing}
                onSubmit={async (val) => {
                    const { lastRun, ...rest } = editing;

                    await update({
                        id: editing.id,
                        data: {
                            ...rest,
                            ...val,
                            config: {
                                ...editing.config,
                                scheduleMinutes: val.scheduleMinutes,
                                scheduleHours: val.scheduleHours,
                                lockoutMinutes: val.lockoutMinutes,
                                lockoutHours: val.lockoutHours,
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
