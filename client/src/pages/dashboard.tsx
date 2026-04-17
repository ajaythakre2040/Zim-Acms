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

export default function Dashboard() {
  const REFRESH_MS = 5000;
  React.useEffect(() => {
    const handler = (e: any) => {
      setSelectedDate(e.detail);
    };

    window.addEventListener("dateChange", handler);

    return () => {
      window.removeEventListener("dateChange", handler);
    };
  }, []);
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
      <ShiftWiseEmpCount doors={doors} selectedDate={selectedDate} refreshInterval={REFRESH_MS} />

      <div className="grid md:grid-cols-2 gap-4">
        {/* <AttendanceCard refreshInterval={REFRESH_MS} />
        <SystemHealthCard total={totalDevices} online={onlineDevices} /> */}
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
      <CardHeader className="pb-3 border-b bg-muted/10 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          Door-wise Attendance Summary
        </CardTitle>

        {/* ✅ DATE FILTER RIGHT SIDE */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            // 👇 IMPORTANT: parent ko update karna padega
            window.dispatchEvent(
              new CustomEvent("dateChange", { detail: e.target.value })
            );
          }}
          className="border rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
        />
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

interface ShiftWiseEmpCountProps {
  doors?: any[]; // Optional rakha hai taaki agar call karte waqt pass ho toh error na aaye
  selectedDate: string;
  refreshInterval: number;
}

function ShiftWiseEmpCount({
  doors,
  selectedDate,
  refreshInterval,
}: ShiftWiseEmpCountProps) {
  // 1. Shifts fetch karein columns ke names (SH_A, SH_B) dikhane ke liye
  const { data: shifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts"],
  });

  // 2. Nayi API se data fetch karein
  const { data: shiftStats = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/attendance/shift-door-stats", selectedDate],
    queryFn: async () => {
      // ✅ Correct API Path as per your requirement
      const res = await fetch(`/api/dashboard/attendance/shift-door-stats?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch shift stats");
      return res.json();
    },
    refetchInterval: refreshInterval,
  });

  if (isLoading) return (
    <Card className="p-6">
      <Skeleton className="h-40 w-full" />
    </Card>
  );

  return (
    <Card className="col-span-full border-none shadow-sm ring-1 ring-border overflow-hidden">
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
              <tr className="bg-muted/30 border-b text-center">
                <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r w-48">
                  Door Name
                </th>

                {/* Dynamic Shift Columns: SH_A, SH_B, etc. */}
                {shifts.map((shift) => (
                  <th
                    key={shift.id}
                    className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r min-w-[80px]"
                  >
                    {shift.name}
                  </th>
                ))}

                <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-blue-600 bg-blue-50/30 dark:bg-blue-900/10 min-w-[100px]">
                  Total Emp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shiftStats.length > 0 ? (
                shiftStats.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium border-r bg-muted/5">
                      {row.doorName}
                    </td>

                    {/* API keys match shift names (e.g., row["SH_A"]) */}
                    {shifts.map((shift) => {
                      const count = row[shift.name] ?? 0; // null/undefined ke liye 0
                      return (
                        <td
                          key={shift.id}
                          className="px-4 py-3 text-center border-r font-semibold"
                        >
                          {count}
                        </td>
                      );
                    })}

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
