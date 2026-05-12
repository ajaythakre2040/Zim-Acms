import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Activity, Monitor } from "lucide-react";
import { useLocation } from "wouter";
// Shadcn Dialog Imports
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

export default function LiveLogsDashboard() {
      const { canExport, canView } = usePermission(MENU_CONFIG.LIVE_LOGS.code);
          if (!canView) {
            return (
              <div className="p-10 text-center">
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p className="text-muted-foreground">You don't have permission to view reports.</p>
              </div>
            );
          }
    const [, setLocation] = useLocation();
    const REFRESH_MS = 2000;

    const { data = [], isLoading } = useQuery({
        queryKey: ["/api/dashboard/attendance/machine-logs"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/attendance/machine-logs");
            const json = await res.json();
            return json.machineFeed || [];
        },
        refetchInterval: REFRESH_MS,
    });

    const exportToCSV = () => {
        if (!data.length) return;
        const headers = [
            "Employee Name",
            "Employee Code",
            "Door Name",
            "Device Name",
            "Direction",
            "Log Date",
            "Status",
            "Remarks",
        ];
        const rows = data.map((log: any) => {
            const dateObj = new Date(log.logDate);
            const cleanDate = dateObj.toISOString().replace("T", " ").split(".")[0];
            return [
                log.employeeName,
                log.employeeCode,
                log.doorName,
                log.deviceName,
                log.direction,
                cleanDate,
                log.status,
                log.remarks || "",
            ];
        });
        let csvContent =
            "data:text/csv;charset=utf-8," +
            [headers, ...rows]
                .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
                .join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "machine_logs.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg text-white">
                    <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Device Access Logs
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Real-time machine interaction and security events.
                    </p>
                </div>
            </div>

            <Card className="border-none shadow-sm ring-1 ring-border">
                <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-500" />
                        Live Machine Feed
                    </CardTitle>

                    <div className="flex items-center gap-2">
                        {/* View Details - Blue Theme */}
                        <button
                            onClick={() => setLocation("/reports?tab=access-logs")}
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center gap-1.5"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                        </button>

                        {/* Export CSV - Green Theme */}
                        {canExport && (

                        <button
                            onClick={exportToCSV}
                            className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-medium flex items-center gap-1.5"
                        >
                            <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                            </svg>
                            Export CSV
                        </button>
                        )}

                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-muted/90 border-b sticky top-0 z-10 backdrop-blur-sm text-center">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left">
                                        Employee Name
                                    </th>
                                    <th className="px-4 py-3 font-semibold">Employee Code</th>
                                    <th className="px-4 py-3 font-semibold">Door Name</th>
                                    <th className="px-4 py-3 font-semibold">Device Name</th>
                                    <th className="px-4 py-3 font-semibold">Direction</th>
                                    <th className="px-4 py-3 font-semibold">Log Date</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Remarks</th>
                                    <th className="px-4 py-3 font-semibold">View Photo</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {isLoading
                                    ? Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={9} className="p-2">
                                                <Skeleton className="h-12 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                    : data.map((log: any, i: number) => (
                                        <tr
                                            key={i}
                                            className="hover:bg-muted/30 text-center transition-colors"
                                        >
                                            <td className="px-4 py-3 font-medium text-left">
                                                {log.employeeName}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {log.employeeCode}
                                            </td>
                                            <td className="px-4 py-3">{log.doorName}</td>
                                            <td className="px-4 py-3">{log.deviceName}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.direction === "IN" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
                                                >
                                                    {log.direction}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                                                {log.logDate?.replace("T", " ").split(".")[0]}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${log.status?.toLowerCase() === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                                                >
                                                    {log.status || "Unknown"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-muted-foreground italic min-w-[150px]">
                                                {log.remarks || "-"}
                                            </td>

                                            {/* Updated Photo Column with Proper Modal */}
                                            <td className="px-4 py-3">
                                                {log.photo ? (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button
                                                                className="inline-flex items-center justify-center p-2 rounded-full hover:bg-primary/10 text-primary transition-all active:scale-90"
                                                                title="View Captured Photo"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-[450px] p-0 border-none bg-white shadow-2xl overflow-hidden">
                                                            <DialogHeader className="p-4 border-b">
                                                                <DialogTitle className="text-sm font-bold flex justify-between items-center">
                                                                    <span>{log.employeeName}</span>
                                                                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md">
                                                                        ID: {log.employeeCode}
                                                                    </span>
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            <div className="bg-black flex items-center justify-center min-h-[300px]">
                                                                <img
                                                                    src={log.photo}
                                                                    alt="Log capture"
                                                                    className="max-w-full h-auto max-h-[60vh] object-contain"
                                                                />
                                                            </div>
                                                            <div className="p-3 bg-muted/20 flex justify-between items-center text-[10px] text-muted-foreground">
                                                                <span>Device: {log.deviceName}</span>
                                                                <span>
                                                                    {
                                                                        log.logDate
                                                                            ?.replace("T", " ")
                                                                            .split(".")[0]
                                                                    }
                                                                </span>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                ) : (
                                                    <span className="text-muted-foreground text-[10px] italic">
                                                        No Image
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
