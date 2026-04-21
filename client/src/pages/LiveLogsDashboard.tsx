import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShieldAlert, CheckCircle2, Monitor } from "lucide-react";

export default function LiveLogsDashboard() {
    const REFRESH_MS = 2000; // Live logs ke liye fast refresh

    const { data: logs = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/access-logs/live"],
        refetchInterval: REFRESH_MS,
    });

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg text-white">
                    <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Machine Access Logs</h1>
                    <p className="text-xs text-muted-foreground">Real-time machine interaction and security events.</p>
                </div>
            </div>

            {/* Top Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-emerald-500">
                    <CardContent className="p-4 flex items-center gap-4">
                        <CheckCircle2 className="text-emerald-500" />
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Authorized Today</p>
                            <p className="text-2xl font-bold">1,240</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-rose-500">
                    <CardContent className="p-4 flex items-center gap-4">
                        <ShieldAlert className="text-rose-500" />
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Unauthorized Attempts</p>
                            <p className="text-2xl font-bold text-rose-600">12</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Log Table */}
            <Card className="border-none shadow-sm ring-1 ring-border">
                <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-500" />
                        Live Machine Feed
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left">Timestamp</th>
                                    <th className="px-4 py-3 text-left">Employee</th>
                                    <th className="px-4 py-3 text-left">Machine / Door</th>
                                    <th className="px-4 py-3 text-left">Event</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-4"><Skeleton className="h-20 w-full" /></td></tr>
                                ) : (
                                    logs.map((log, i) => (
                                        <tr key={i} className="hover:bg-muted/5">
                                            <td className="px-4 py-3 text-xs font-mono">{new Date(log.time).toLocaleTimeString()}</td>
                                            <td className="px-4 py-3 font-medium">{log.empName}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{log.deviceName}</td>
                                            <td className="px-4 py-3">{log.direction}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${log.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}