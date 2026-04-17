import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  DoorOpen,
  Sparkles,
  Wifi,
  WifiOff,
  Server,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import type { Device, Door } from "@shared/schema";

// MOCK OR IMPORT THESE COMPONENTS
// import ShiftWiseEmpCount from "./ShiftWiseEmpCount"; 
// import AttendanceCard from "./AttendanceCard";
// import SystemHealthCard from "./SystemHealthCard";

export default function Dashboard() {
  const REFRESH_MS = 5000;

  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );

  // FIX: Added selectedDate to queryKey and URL
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: REFRESH_MS,
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: REFRESH_MS,
  });

  const { data: doors = [], isLoading: doorsLoading } = useQuery<Door[]>({
    queryKey: ["/api/doors"],
    refetchInterval: REFRESH_MS,
  });

  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const offlineDevices = devices.filter((d) => d.status === "offline").length;
  const totalDoors = doors.length;

  const isLoading = statsLoading || devicesLoading || doorsLoading;

  const statCards = [
    {
      title: "Total People",
      value: stats?.totalPeople || 0,
      icon: Users,
      lightBg: "bg-blue-50 dark:bg-blue-950/40",
      textColor: "text-blue-600",
      ring: "ring-blue-200",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      title: "Total Shifts",
      value: stats?.totalshift || 0,
      icon: UserCheck,
      lightBg: "bg-emerald-50",
      textColor: "text-emerald-600",
      ring: "ring-emerald-200",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      title: "Total Doors",
      value: totalDoors,
      icon: DoorOpen,
      lightBg: "bg-orange-50",
      textColor: "text-orange-600",
      ring: "ring-orange-200",
      gradient: "from-orange-500 to-amber-500",
    },
    {
      title: "Total Devices",
      value: totalDevices,
      icon: Server,
      lightBg: "bg-violet-50",
      textColor: "text-violet-600",
      ring: "ring-violet-200",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      title: "Online Devices",
      value: onlineDevices,
      icon: Wifi,
      lightBg: "bg-cyan-50",
      textColor: "text-cyan-600",
      ring: "ring-cyan-200",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      title: "Offline Devices",
      value: offlineDevices,
      icon: WifiOff,
      lightBg: "bg-slate-100",
      textColor: "text-slate-600",
      ring: "ring-slate-200",
      gradient: "from-slate-400 to-slate-600",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER WITH DATE FILTER */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time monitoring of {totalDoors} doors and {totalDevices}{" "}
              devices.
            </p>
          </div>
        </div>

        <div className="flex items-center mt-1">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
          />
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-3">
                  <div
                    className={`w-9 h-9 rounded-lg ${card.lightBg} flex items-center justify-center ring-1 ${card.ring}`}
                  >
                    <card.icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">
                      {card.title}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FIX: Passed selectedDate to DoorAttendanceTable */}
      <DoorAttendanceTable selectedDate={selectedDate} refreshInterval={5000} />

      {/* Note: You might need to pass selectedDate to these as well if they filter by date */}
      <ShiftWiseEmpCount doors={doors} refreshInterval={REFRESH_MS} />

      <div className="grid md:grid-cols-2 gap-4">
        <AttendanceCard refreshInterval={REFRESH_MS} />
        <SystemHealthCard total={totalDevices} online={onlineDevices} />
      </div>
    </div>
  );
}

function DoorAttendanceTable({
  selectedDate, // Prop added
  refreshInterval,
}: {
  selectedDate: string; // Type added
  refreshInterval: number;
}) {
  // FIX: Added selectedDate to queryKey and URL
  const { data: apiResponse, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/attendance/door-wise-stats", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/attendance/door-wise-stats?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch door stats");
      return res.json();
    },
    refetchInterval: refreshInterval,
  });

  if (isLoading) return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  );

  const doorStats = apiResponse?.doorStats || [];
  const totalPresent = apiResponse?.totalPresent || 0;
  const totalAbsent = apiResponse?.totalAbsent || 0;
  const totalManpower = apiResponse?.totalManpower || 0;

  return (
    <Card className="col-span-full border-none shadow-sm ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          Door-wise Attendance Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-4 py-3 text-left font-bold text-xs uppercase border-r text-muted-foreground">
                  Direction
                </th>

                {doorStats.map((door: any) => (
                  <th
                    key={door.doorName}
                    className="px-4 py-3 text-center font-bold text-xs uppercase border-r whitespace-nowrap"
                  >
                    {door.doorName}
                  </th>
                ))}

                <th className="px-6 py-3 text-center text-emerald-600 border-l font-bold uppercase text-xs">
                  Total Present
                </th>
                <th className="px-6 py-3 text-center text-rose-600 border-l font-bold uppercase text-xs">
                  Total Absent
                </th>
                <th className="px-6 py-3 text-center text-blue-600 border-l font-bold uppercase text-xs">
                  Total Manpower
                </th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b hover:bg-muted/5 transition-colors">
                <td className="px-4 py-4 font-bold text-blue-600 bg-blue-50/30">IN</td>
                {doorStats.map((door: any) => (
                  <td key={door.doorName} className="px-4 text-center text-lg font-semibold text-blue-600">
                    {door.inCount}
                  </td>
                ))}

                <td rowSpan={3} className="px-4 text-center text-3xl font-black text-emerald-500 border-l bg-emerald-50/10">
                  {totalPresent}
                </td>
                <td rowSpan={3} className="px-4 text-center text-3xl font-black text-rose-500 border-l bg-rose-50/10">
                  {totalAbsent}
                </td>
                <td rowSpan={3} className="px-4 text-center text-3xl font-black text-blue-600 border-l bg-blue-50/10">
                  {totalManpower}
                </td>
              </tr>

              <tr className="border-b hover:bg-muted/5 transition-colors">
                <td className="px-4 py-4 font-bold text-orange-500 bg-orange-50/30">OUT</td>
                {doorStats.map((door: any) => (
                  <td key={door.doorName} className="px-4 text-center text-lg font-semibold text-orange-500">
                    {door.outCount}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-muted/5 transition-colors">
                <td className="px-4 py-4 font-bold text-slate-700 bg-slate-50/30">BAL</td>
                {doorStats.map((door: any) => (
                  <td key={door.doorName} className="px-4 text-center text-lg font-bold text-slate-900">
                    {door.balance}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ShiftWiseEmpCount({
  doors,
  refreshInterval,
}: {
  doors: Door[];
  refreshInterval: number;
}) {
  // 1. Shifts fetch karein columns banane ke liye
  const { data: shifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts"],
  });

  // 2. Shift-wise data fetch karein (Backend se doorId aur shiftId ke basis par count)
  const { data: shiftStats } = useQuery<any[]>({
    queryKey: ["/api/attendance/shift-door-stats"],
    refetchInterval: refreshInterval,
  });

  return (
    <Card className="col-span-full border-none shadow-sm ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" /> Shift-wise Employee
          Count
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b">
                {/* Fixed First Column */}
                <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r w-48">
                  Door Name
                </th>

                {/* Dynamic Shift Columns */}
                {shifts.map((shift) => (
                  <th
                    key={shift.id}
                    className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r min-w-[100px]"
                  >
                    {shift.name}
                  </th>
                ))}

                {/* Last Total Column */}
                <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-blue-600 bg-blue-50/30 dark:bg-blue-900/10 min-w-[100px]">
                  Total Emp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {doors.map((door) => {
                let doorTotal = 0;

                return (
                  <tr
                    key={door.id}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium border-r bg-muted/5">
                      {door.name}
                    </td>

                    {/* Har shift ke liye count dikhayenge */}
                    {shifts.map((shift) => {
                      // Stats array se matching door aur shift ka count nikalna
                      const count =
                        shiftStats?.find(
                          (s) => s.doorId === door.id && s.shiftId === shift.id,
                        )?.count || 0;

                      doorTotal += count;

                      return (
                        <td
                          key={shift.id}
                          className="px-4 py-3 text-center border-r font-semibold"
                        >
                          {count}
                        </td>
                      );
                    })}

                    {/* Row ka total (Total Emp in all shifts for this door) */}
                    <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/10">
                      {doorTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceCard({ refreshInterval }: { refreshInterval: number }) {
  const { data: summary } = useQuery<any>({
    queryKey: ["/api/attendance/summary"],
    refetchInterval: refreshInterval,
  });

  const items = [
    { label: "Present", value: summary?.present || 0, color: "bg-emerald-500" },
    { label: "Late", value: summary?.late || 0, color: "bg-amber-500" },
    { label: "Absent", value: summary?.absent || 0, color: "bg-rose-500" },
  ];
  const total = summary?.total || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" /> Today's Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium">
              <span className="text-muted-foreground">{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} transition-all duration-700`}
                style={{ width: `${(item.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SystemHealthCard({
  total,
  online,
}: {
  total: number;
  online: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Device
          Connectivity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium">Total Controllers</span>
          </div>
          <span className="text-xs font-bold">{total}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Active Sync
            </span>
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {online}
          </span>
        </div>
        <p className="text-[10px] text-center text-muted-foreground pt-1 uppercase font-bold tracking-tighter">
          Hardware Status: <span className="text-emerald-500">Stable</span>
        </p>
      </CardContent>
    </Card>
  );
}
