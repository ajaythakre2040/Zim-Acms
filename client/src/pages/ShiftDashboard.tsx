import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Clock, CalendarCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function ShiftDashboard() {
  const REFRESH_MS = 5000;
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg text-white">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Shift Analytics
            </h1>
            <p className="text-xs text-muted-foreground">
              Detailed manpower distribution across shifts.
            </p>
          </div>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-violet-500 outline-none dark:bg-slate-900"
        />
      </div>

      {/* Table Component Call */}
      <ShiftWiseEmpCount
        selectedDate={selectedDate}
        refreshInterval={REFRESH_MS}
      />
    </div>
  );
}

// --- ERROR FIX: Define the component below ---

interface ShiftWiseEmpCountProps {
  selectedDate: string;
  refreshInterval: number;
}

export function ShiftWiseEmpCount({
  selectedDate,
  refreshInterval,
}: ShiftWiseEmpCountProps) {
  const COLORS = [
    "#6366f1",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#a855f7",
    "#14b8a6",
  ];

  // 1. Fetch Shift Names (SH_A, SH_B, etc.)
  const { data: shifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts"],
  });

  // 2. Fetch Shift Stats data
  const { data: shiftStats = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/attendance/shift-door-stats", selectedDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/attendance/shift-door-stats?date=${selectedDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch shift stats");
      return res.json();
    },
    refetchInterval: refreshInterval,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  const chartData = shifts.map((shift) => {
    const total = shiftStats.reduce((sum: number, row: any) => {
      return sum + (row[shift.name] || 0);
    }, 0);

    return {
      name: shift.name,
      value: total,
    };
  });
  return (
    <div className="space-y-6">
      {/* 🔹 TABLE CARD (same code inside) */}
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
                  <th className="px-4 py-3 text-left font-bold text-[10px] uppercase border-r">
                    Door Name
                  </th>

                  {shifts.map((shift) => (
                    <th
                      key={shift.id}
                      className="px-4 py-3 text-center font-bold text-[10px] uppercase border-r"
                    >
                      {shift.name}
                    </th>
                  ))}

                  <th className="px-4 py-3 text-center font-bold text-[10px] uppercase text-blue-600 bg-blue-50/30">
                    Total Emp
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {shiftStats.length > 0 ? (
                  shiftStats.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/5">
                      <td className="px-4 py-3 font-medium border-r bg-muted/5">
                        {row.doorName}
                      </td>

                      {shifts.map((shift) => (
                        <td
                          key={shift.id}
                          className="px-4 py-3 text-center border-r font-semibold"
                        >
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
                    <td
                      colSpan={shifts.length + 2}
                      className="p-10 text-center text-muted-foreground"
                    >
                      No records found for {selectedDate}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 🔥 CHARTS SECTION (separate from table) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BAR CHART */}
        <Card className="p-4 shadow-sm ring-1 ring-border">
          <p className="text-sm font-bold mb-2">Shift-wise Bar</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }} // 🔥 important
              >
                <XAxis
                  dataKey="name"
                  angle={-25} // 🔥 tilt labels
                  textAnchor="end"
                  interval={0} // 🔥 show all labels
                  height={60} // 🔥 space for labels
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 15 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* PIE CHART */}
        <Card className="p-4 shadow-sm ring-1 ring-border">
          <p className="text-sm font-bold mb-2">Shift Distribution</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />

                {/* 🔥 FIXED LEGEND */}
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
