import { useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Play, Timer, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function CronTab({ group, label }: { group: string; label: string }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const { toast } = useToast();

    const { data, isLoading, create, update, remove, isCreating, isUpdating } = useCrud<any>("/api/cron-jobs", label);

    const filteredData = data?.filter((item: any) => item.group === group) || [];

    const fields: FieldConfig[] = [
        { key: "name", label: "Job Name", required: true },
        { key: "expression", label: "Cron Expression (e.g. */5 * * * *)", required: true },
        {
            key: "task",
            label: "Task Type",
            type: "select",
            required: true,
            options: [
                { value: "sync_attendance", label: "Sync Attendance" },
                { value: "clear_logs", label: "Clear Logs" },
                { value: "db_backup", label: "Database Backup" }
            ]
        },
        { key: "isActive", label: "Active", type: "switch", defaultValue: true },
        // 'hidden' ki jagah hum ise fields se nikal dete hain kyunki hum ise handleSubmit mein merge kar rahe hain
    ];
    const columns = [
        {
            key: "name",
            label: "Job Name",
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted w-fit px-1 rounded">
                        {item.expression}
                    </span>
                </div>
            )
        },
        {
            key: "task",
            label: "Task",
            render: (item: any) => (
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize">
                    <Activity className="w-3 h-3 mr-1" /> {item.task.replace("_", " ")}
                </Badge>
            )
        },
        {
            key: "lastRun",
            label: "Last Run",
            render: (item: any) => item.lastRun ? format(new Date(item.lastRun), "PP p") : "Never"
        },
        {
            key: "isActive",
            label: "Status",
            render: (item: any) => (
                <Badge variant={item.isActive ? "default" : "secondary"} className={item.isActive ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20" : ""}>
                    {item.isActive ? "Running" : "Paused"}
                </Badge>
            )
        },
        {
            key: "actions",
            label: "",
            render: (item: any) => (
                <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400" title="Run Now">
                        <Play className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(item); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400" onClick={() => remove(item.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )
        },
    ];

    const handleSubmit = async (formData: any) => {
        setFormErrors({});
        // Yahan hum manual 'group' add kar rahe hain, isliye hidden field ki zaroorat nahi
        const finalData = { ...formData, group };

        try {
            if (editing) {
                await update({ id: editing.id, data: finalData });
            } else {
                await create(finalData);
            }
            setDialogOpen(false);
            setEditing(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Add Job
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded border">
                    <Timer className="w-3 h-3" /> {format(new Date(), "HH:mm:ss")}
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredData}
                isLoading={isLoading}
                searchable
                searchKeys={["name"]}
                emptyMessage="No cron jobs found"
            />

            <CrudDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditing(null); }}
                title={editing ? `Edit ${label}` : `Add ${label}`}
                fields={fields}
                initialData={editing || { isActive: true, group }}
                onSubmit={handleSubmit}
                isPending={isCreating || isUpdating}
                errors={formErrors}
            />
        </div>
    );
}

export default function CronMasterPage() {
    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Cron Master"
                description="Manage background automation and scheduled tasks"
            />

            <Tabs defaultValue="main_gate" className="space-y-4">
                <TabsList className="bg-background border shadow-sm">
                    <TabsTrigger value="main_gate">Main Gate Cron</TabsTrigger>
                    <TabsTrigger value="office">Office Cron</TabsTrigger>
                    <TabsTrigger value="system">System Tasks</TabsTrigger>
                </TabsList>

                <TabsContent value="main_gate">
                    <CronTab group="main_gate" label="Main Gate Cron" />
                </TabsContent>

                <TabsContent value="office">
                    <CronTab group="office" label="Office Cron" />
                </TabsContent>

                <TabsContent value="system">
                    <CronTab group="system" label="System Cron" />
                </TabsContent>
            </Tabs>
        </div>
    );
}