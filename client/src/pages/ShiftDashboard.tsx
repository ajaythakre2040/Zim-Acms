import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Clock, CalendarCheck } from "lucide-react";

export default function ShiftDashboard() {
    const REFRESH_MS = 5000;
    const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg text-white">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Shift Analytics</h1>
                        <p className="text-xs text-muted-foreground">Detailed manpower distribution across shifts.</p>
                    </div>
                </div>

                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-violet-500 outline-none dark:bg-slate-900"
                />
            </div>

            {/* Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-violet-50/50 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <CalendarCheck className="w-8 h-8 text-violet-600" />
                        <div>
                            <p className="text-sm text-violet-600 font-medium italic">Reporting Date</p>
                            <p className="text-xl font-bold">{selectedDate}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table Component Call */}
            <ShiftWiseEmpCount selectedDate={selectedDate} refreshInterval={REFRESH_MS} />
        </div>
    );
}

// --- ERROR FIX: Define the component below ---

interface ShiftWiseEmpCountProps {
    selectedDate: string;
    refreshInterval: number;
}

export function ShiftWiseEmpCount({ selectedDate, refreshInterval }: ShiftWiseEmpCountProps) {
    // 1. Fetch Shift Names (SH_A, SH_B, etc.)
    const { data: shifts = [] } = useQuery<any[]>({
        queryKey: ["/api/shifts"],
    });

    // 2. Fetch Shift Stats data
    const { data: shiftStats = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/dashboard/attendance/shift-door-stats", selectedDate],
        queryFn: async () => {
            const res = await fetch(`/api/dashboard/attendance/shift-door-stats?date=${selectedDate}`);
            if (!res.ok) throw new Error("Failed to fetch shift stats");
            return res.json();
        },
        refetchInterval: refreshInterval,
    });

    if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

    return (
        <Card className="border-none shadow-sm ring-1 ring-border overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-500" />
                    Shift-wise Employee Count
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b">
                                <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r">
                                    Door Name
                                </th>
                                {shifts.map((shift) => (
                                    <th key={shift.id} className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r">
                                        {shift.name}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-blue-600 bg-blue-50/30">
                                    Total Emp
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {shiftStats.length > 0 ? (
                                shiftStats.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                                        <td className="px-4 py-3 font-medium border-r bg-muted/5">{row.doorName}</td>
                                        {shifts.map((shift) => (
                                            <td key={shift.id} className="px-4 py-3 text-center border-r font-semibold">
                                                {row[shift.name] ?? 0}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/10">
                                            {row.totalEmp}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={shifts.length + 2} className="p-10 text-center text-muted-foreground">
                                        No records found for {selectedDate}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}