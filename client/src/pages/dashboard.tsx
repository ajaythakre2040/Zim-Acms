import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DoorOpen, Sparkles, Wifi, WifiOff, Server, UserCheck } from "lucide-react";
import type { Device, Door } from "@shared/schema";
import { useNavigate } from "react-router-dom";
import { navigate } from "wouter/use-browser-location";

export default function Dashboard() {
  const REFRESH_MS = 5000;
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);
  React.useEffect(() => {
    const handler = (e: any) => setSelectedDate(e.detail);
    window.addEventListener("dateChange", handler);
    return () => window.removeEventListener("dateChange", handler);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: REFRESH_MS,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: REFRESH_MS,
  });

  const { data: doors = [] } = useQuery<Door[]>({
    queryKey: ["/api/doors"],
    refetchInterval: REFRESH_MS,
  });

  const statCards = [
  { title: "Total Employees", value: stats?.totalPeople || 0, icon: Users, route: "/people", lightBg: "bg-blue-50", textColor: "text-blue-600", ring: "ring-blue-200" },
  { title: "Total Shifts", value: stats?.totalshift || 0, icon: UserCheck, route: "/shifts", lightBg: "bg-emerald-50", textColor: "text-emerald-600", ring: "ring-emerald-200" },
  { title: "Total Doors", value: doors.length, icon: DoorOpen, route: "/zones", lightBg: "bg-orange-50", textColor: "text-orange-600", ring: "ring-orange-200" },
  { title: "Total Devices", value: devices.length, icon: Server, route: "/devices", lightBg: "bg-violet-50", textColor: "text-violet-600", ring: "ring-violet-200" },
  { title: "Online", value: devices.filter(d => d.status === "online").length, icon: Wifi, route: "/devices", lightBg: "bg-cyan-50", textColor: "text-cyan-600", ring: "ring-cyan-200" },
  { title: "Offline", value: devices.filter(d => d.status === "offline").length, icon: WifiOff, route: "/devices", lightBg: "bg-slate-100", textColor: "text-slate-600", ring: "ring-slate-200" },
];
const extraCards = [
  { title: "Main Gate IN", value: stats?.mainGateIn || 0, color: "text-blue-600" },
  { title: "Main Gate OUT", value: stats?.mainGateOut || 0, color: "text-orange-500" },
  { title: "BAL", value: stats?.balance || 0, color: "text-slate-700" },
  { title: "Absent", value: stats?.absent || 0, color: "text-red-500" },
  { title: "Present", value: stats?.present || 0, color: "text-emerald-500" },
  { title: "Total Employees", value: stats?.totalPeople || 0, color: "text-violet-600" },
];
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg text-white">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Summary</h1>
          <p className="text-xs text-muted-foreground">Real-time status of all entry/exit points.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
  {statCards.map((card, i) => (
    <Card
      key={i}
      onClick={() => navigate(card.route)}
      className="shadow-sm border-none ring-1 ring-border cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
    >
      <CardContent className="p-4 space-y-3">
        <div className={`w-9 h-9 rounded-lg ${card.lightBg} flex items-center justify-center ring-1 ${card.ring}`}>
          <card.icon className={`w-5 h-5 ${card.textColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{card.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-bold">{card.title}</p>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
      
{/* 🔥 NEW CARDS */}
<div className="grid grid-cols-2 md:grid-cols-6 gap-4">
  {extraCards.map((card, i) => (
    <Card key={i} className="shadow-sm border-none ring-1 ring-border">
      <CardContent className="p-4 space-y-3">
        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        <p className="text-[10px] text-muted-foreground uppercase font-bold">
          {card.title}
        </p>
      </CardContent>
    </Card>
  ))}
</div>
      {/* Yahan call ho raha hai */}
      <DoorAttendanceTable selectedDate={selectedDate} refreshInterval={REFRESH_MS} />
    </div>
  );
}

// FIX: Table component ko export/define karna zaroori hai
export function DoorAttendanceTable({ selectedDate, refreshInterval }: { selectedDate: string, refreshInterval: number }) {
  const { data: apiResponse, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/attendance/door-wise-stats", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/attendance/door-wise-stats?date=${selectedDate}`);
      return res.json();
    },
    refetchInterval: refreshInterval,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const doorStats = apiResponse?.doorStats || [];

  return (
    <Card className="border-none shadow-sm ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/10 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          Door-wise Attendance
        </CardTitle>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => window.dispatchEvent(new CustomEvent("dateChange", { detail: e.target.value }))}
          className="border rounded px-2 py-1 text-xs"
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3 text-left border-r">Direction</th>
                {doorStats.map((d: any) => <th key={d.doorName} className="px-4 py-3 text-center border-r">{d.doorName}</th>)}
                {/* <th className="px-4 py-3 text-center text-emerald-600 bg-emerald-50/50">Present</th> */}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3 font-bold text-blue-600 bg-blue-50/20">IN</td>
                {doorStats.map((d: any) => <td key={d.doorName} className="text-center font-semibold">{d.inCount}</td>)}
                {/* <td rowSpan={3} className="text-center text-3xl font-black text-emerald-500 bg-emerald-50/20">{apiResponse?.totalPresent || 0}</td> */}
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 font-bold text-orange-500 bg-orange-50/20">OUT</td>
                {doorStats.map((d: any) => <td key={d.doorName} className="text-center font-semibold">{d.outCount}</td>)}
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-700 bg-slate-50/20">BAL</td>
                {doorStats.map((d: any) => <td key={d.doorName} className="text-center font-bold">{d.balance}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}