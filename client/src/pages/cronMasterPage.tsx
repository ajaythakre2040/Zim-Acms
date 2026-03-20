import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plus,
    Pencil,
    Trash2,
    Settings2,
    History,
    Activity,
    Clock,
    Timer,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function DynamicCronDashboard() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const { toast } = useToast();

    const {
        data: crons,
        isLoading: cronsLoading,
        create,
        update,
        remove,
        isCreating,
        isUpdating,
    } = useCrud<any>("/api/cron-jobs", "Cron Master");

    const fields: FieldConfig[] = [
        {
            key: "displayName",
            label: "Job Name",
            required: true,
            placeholder: "e.g., Main Gate Sync",
            readOnly: !!editing,
        },
        {
            key: "cronKey",
            label: "Code",
            required: true,
            placeholder: "MAIN_GATE_SYNC",
            readOnly: !!editing,
        },
        {
            key: "scheduleTime",
            label: "Schedule Time (Cron Format)",
            required: true,
            placeholder: "*/5 * * * *",
            // @ts-ignore
            description: "Format: min hour dom month dow",
            pattern: "^[0-9*\\/\\-, .]*$",
            validate: (value: string) => {
                const cronRegex = /^[0-9*\/\-, .]+$/;
                if (!cronRegex.test(value)) {
                    return "Only numbers and cron symbols (* / - , .) are allowed";
                }
                return true;
            },
        },
        {
            key: "isActive",
            label: "Execution Enabled",
            type: "switch",
            defaultValue: true,
        },
    ];

    const masterColumns = [
        {
            key: "displayName",
            label: "Job Info",
            render: (i: any) => (
                <div className="flex flex-col">
                    <span className="font-bold text-sm">{i.displayName}</span>
                    <span className="text-[10px] font-mono text-blue-500 uppercase">
                        {i.cronKey}
                    </span>
                </div>
            ),
        },
        {
            key: "scheduleTime",
            label: "Schedule",
            render: (i: any) => (
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded border">
                        {i.scheduleTime}
                    </code>
                </div>
            ),
        },
        {
            key: "executionStatus",
            label: "Current Status",
            render: (i: any) => (
                <div className="flex flex-col gap-1">
                    {i.isRunning ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> In Progress
                        </Badge>
                    ) : (
                        <Badge
                            variant={i.isActive ? "default" : "secondary"}
                            className={
                                i.isActive
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : ""
                            }
                        >
                            {i.isActive ? "Ready" : "Paused"}
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: "lastRun",
            label: "Last Run Stats",
            render: (i: any) => (
                <div className="flex flex-col text-[11px]">
                    <span className="text-muted-foreground">
                        {i.lastRun ? format(new Date(i.lastRun), "HH:mm:ss") : "Never"}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-amber-600">
                        <Timer className="w-3 h-3" /> {i.lastRunDuration || 0}s
                    </span>
                </div>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (i: any) => (
                <div className="flex gap-1"> {/* UPDATE: justify-end hata diya taaki header ke niche align ho */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                            setEditing(i);
                            setDialogOpen(true);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    {/* <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500"
                        onClick={() => remove(i.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button> */}
                </div>
            ),
        },
    ];

    return (
        <div className="p-4 md:p-8 max-w-[1500px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="Automation Hub"
                    description="Single-table system for all background processes."
                />
                <div className="flex items-center gap-4 bg-card border rounded-xl px-4 py-2 shadow-sm">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Server Time
                        </span>
                        <span className="text-sm font-mono">
                            {format(new Date(), "HH:mm:ss")}
                        </span>
                    </div>
                    <Clock className="w-5 h-5 text-primary" />
                </div>
            </div>

            <Tabs defaultValue="master" className="space-y-6">
                <div className="overflow-x-auto">
                    <TabsList className="bg-muted/50 border p-1 h-auto flex w-max gap-1">
                        <TabsTrigger value="master" className="gap-2 px-6 py-2">
                            <Settings2 className="w-4 h-4" /> Master Control
                        </TabsTrigger>
                        {crons?.map((cron: any) => (
                            <TabsTrigger
                                key={cron.id}
                                value={`log-${cron.cronKey}`}
                                className="gap-2 px-6 py-2"
                            >
                                <History className="w-4 h-4" /> {cron.displayName}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent
                    value="master"
                    className="space-y-4 animate-in fade-in duration-500"
                >
                    <div className="flex justify-between items-center bg-card p-5 rounded-2xl border border-primary/10 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Activity className="text-primary w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-none">
                                    Registered Tasks
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Configure intervals and monitor live execution.
                                </p>
                            </div>
                        </div>
                        {/* <Button
                            onClick={() => {
                                setEditing(null);
                                setDialogOpen(true);
                            }}
                            className="shadow-lg shadow-primary/20"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Schedule
                        </Button> */}
                    </div>
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <DataTable
                            columns={masterColumns}
                            data={crons || []}
                            isLoading={cronsLoading}
                        />
                    </div>
                </TabsContent>

                {crons?.map((cron: any) => (
                    <TabsContent
                        key={cron.id}
                        value={`log-${cron.cronKey}`}
                        className="animate-in slide-in-from-right-2 duration-300"
                    >
                        <div className="space-y-4">
                            <div className="bg-card p-6 rounded-2xl border flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`p-3 rounded-full ${cron.lastStatus === "SUCCESS" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
                                    >
                                        {cron.lastStatus === "SUCCESS" ? (
                                            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                                        ) : (
                                            <AlertCircle className="text-rose-500 w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl">
                                            {cron.displayName} Status
                                        </h3>
                                        <p className="text-sm text-muted-foreground italic">
                                            Last Message:{" "}
                                            {cron.lastMessage || "No recent activity recorded."}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="font-mono mb-1">
                                        {cron.scheduleTime}
                                    </Badge>
                                    <p className="text-[10px] text-muted-foreground uppercase">
                                        Schedule Interval
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-card border rounded-xl">
                                    <span className="text-xs text-muted-foreground uppercase">
                                        Last Run
                                    </span>
                                    <p className="font-bold">
                                        {cron.lastRun
                                            ? format(new Date(cron.lastRun), "PP p")
                                            : "N/A"}
                                    </p>
                                </div>
                                <div className="p-4 bg-card border rounded-xl">
                                    <span className="text-xs text-muted-foreground uppercase">
                                        Duration
                                    </span>
                                    <p className="font-bold text-amber-600">
                                        {cron.lastRunDuration || 0} Seconds
                                    </p>
                                </div>
                                <div className="p-4 bg-card border rounded-xl">
                                    <span className="text-xs text-muted-foreground uppercase">
                                        Status
                                    </span>
                                    <p
                                        className={`font-bold ${cron.lastStatus === "SUCCESS" ? "text-emerald-500" : "text-rose-500"}`}
                                    >
                                        {cron.lastStatus || "IDLE"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            <CrudDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                    setEditing(null);
                }}
                title={
                    editing
                        ? `Update Job: ${editing.displayName}`
                        : "Schedule New Automation"
                }
                fields={fields}
                initialData={
                    editing || { isActive: true, priority: "medium", group: "default" }
                }
                onSubmit={async (val) => {
                    const finalData = { ...val, group: val.cronKey };
                    editing
                        ? await update({ id: editing.id, data: finalData })
                        : await create(finalData);
                    setDialogOpen(false);
                    setEditing(null);
                }}
                isPending={isCreating || isUpdating}
            />
        </div>
    );
}