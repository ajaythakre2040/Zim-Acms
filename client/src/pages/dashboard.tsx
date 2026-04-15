import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  TrendingUp,
  DoorOpen,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  Server,
} from "lucide-react";
import type { Device, Door } from "@shared/schema";

export default function Dashboard() {
  // Auto-refresh interval (5 seconds)
  const REFRESH_MS = 5000;

  // 1. Dashboard General Stats
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: REFRESH_MS, // Automatically refresh every 5s
  });

  // 2. Devices Data
  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: REFRESH_MS,
  });

  // 3. Doors Data
  const { data: doors = [], isLoading: doorsLoading } = useQuery<Door[]>({
    queryKey: ["/api/doors"],
    refetchInterval: REFRESH_MS,
  });

  // Logic: Calculations
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const offlineDevices = devices.filter((d) => d.status === "offline").length;
  const totalDoors = doors.length;

  const isLoading = statsLoading || devicesLoading || doorsLoading;

  // Stat Cards Configuration
  const statCards = [
    {
      title: "Total People",
      value: stats?.totalPeople || 0,
      icon: Users,
      lightBg: "bg-blue-50 dark:bg-blue-950/40",
      textColor: "text-blue-600 dark:text-blue-400",
      ring: "ring-blue-200 dark:ring-blue-800/40",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      title: "Active People",
      value: stats?.activePeople || 0,
      icon: UserCheck,
      lightBg: "bg-emerald-50 dark:bg-emerald-950/40",
      textColor: "text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-200 dark:ring-emerald-800/40",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      title: "Total Doors",
      value: totalDoors,
      icon: DoorOpen,
      lightBg: "bg-orange-50 dark:bg-orange-950/40",
      textColor: "text-orange-600 dark:text-orange-400",
      ring: "ring-orange-200 dark:ring-orange-800/40",
      gradient: "from-orange-500 to-amber-500",
    },
    {
      title: "Total Devices",
      value: totalDevices,
      icon: Server,
      lightBg: "bg-violet-50 dark:bg-violet-950/40",
      textColor: "text-violet-600 dark:text-violet-400",
      ring: "ring-violet-200 dark:ring-violet-800/40",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      title: "Online Devices",
      value: onlineDevices,
      icon: Wifi,
      lightBg: "bg-cyan-50 dark:bg-cyan-950/40",
      textColor: "text-cyan-600 dark:text-cyan-400",
      ring: "ring-cyan-200 dark:ring-cyan-800/40",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      title: "Offline Devices",
      value: offlineDevices,
      icon: WifiOff,
      lightBg: "bg-slate-100 dark:bg-slate-900",
      textColor: "text-slate-600 dark:text-slate-400",
      ring: "ring-slate-200 dark:ring-slate-800",
      gradient: "from-slate-400 to-slate-600",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header - Simple Title (System Live badge removed) */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time monitoring of {totalDoors} doors and {totalDevices} devices.
          </p>
        </div>
      </div>

      {/* 6-Card Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-sm ring-1 ring-border relative">
            <CardContent className="p-4 relative z-10">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-3">
                  <div className={`w-9 h-9 rounded-lg ${card.lightBg} flex items-center justify-center ring-1 ${card.ring}`}>
                    <card.icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      {card.title}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-[0.07]`} />
          </Card>
        ))}
      </div>
      <DoorAttendanceTable doors={doors} refreshInterval={REFRESH_MS} />
      <ShiftWiseEmpCount doors={doors} refreshInterval={REFRESH_MS} />

      {/* Main Details Grid (Today's Attendance & System Health) */}
      <div className="grid md:grid-cols-2 gap-4">

      </div>
      {/* Main Details Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <AttendanceCard refreshInterval={REFRESH_MS} />
        <SystemHealthCard total={totalDevices} online={onlineDevices} />
      </div>
    </div>
  );
}

// --- Sub-Components ---
// function DoorAttendanceTable({ doors, refreshInterval }: { doors: Door[], refreshInterval: number }) {
//   // Yahan hum door-wise attendance ka data fetch karenge
//   const { data: doorStats } = useQuery<any[]>({
//     queryKey: ["/api/attendance/door-wise-stats"], 
//     refetchInterval: refreshInterval
//   });

//   return (
//     <Card className="col-span-full">
//       <CardHeader className="pb-3">
//         <CardTitle className="text-sm font-medium flex items-center gap-2">
//           <DoorOpen className="w-4 h-4 text-blue-500" /> Door-wise Attendance Summary
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="rounded-md border overflow-hidden">
//           <table className="w-full text-sm">
//             <thead className="bg-muted/50 border-b">
//               <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
//                 <th className="px-4 py-3 text-left font-bold">Door Name</th>
//                 <th className="px-4 py-3 text-center font-bold">Total Manpower</th>
//                 <th className="px-4 py-3 text-center font-bold text-emerald-600">Total Present</th>
//                 <th className="px-4 py-3 text-center font-bold text-rose-600">Total Absent</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y">
//               {doors.map((door) => {
//                 // Door-wise data find karein (agar API se aa raha ho)
//                 const stats = doorStats?.find(s => s.doorId === door.id);

//                 return (
//                   <tr key={door.id} className="hover:bg-muted/30 transition-colors">
//                     <td className="px-4 py-3 font-medium">{door.name}</td>
//                     <td className="px-4 py-3 text-center">{stats?.total || 0}</td>
//                     <td className="px-4 py-3 text-center font-semibold text-emerald-500">
//                       {stats?.present || 0}
//                     </td>
//                     <td className="px-4 py-3 text-center font-semibold text-rose-500">
//                       {stats?.absent || 0}
//                     </td>
//                   </tr>
//                 );
//               })}
//               {doors.length === 0 && (
//                 <tr>
//                   <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
//                     No doors found in the system.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

function DoorAttendanceTable({ doors, refreshInterval }: { doors: Door[], refreshInterval: number }) {
  // Pure dashboard ka combined stats fetch karne ke liye
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: refreshInterval
  });

  // Door-wise counts fetch karne ke liye
  const { data: doorStats } = useQuery<any[]>({
    queryKey: ["/api/attendance/door-wise-stats"],
    refetchInterval: refreshInterval
  });

  return (
    <Card className="col-span-full border-none shadow-sm ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" /> Door-wise Attendance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b">
                {/* 1. Dynamic Door Columns */}
                {doors.map((door) => (
                  <th key={door.id} className="px-4 py-4 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r min-w-[120px]">
                    {door.name}
                  </th>
                ))}

                {/* 2. Final Static Columns */}
                <th className="px-4 py-4 text-center font-bold text-[10px] uppercase tracking-wider text-emerald-600 border-r bg-emerald-50/50 dark:bg-emerald-900/20 min-w-[140px]">
                  Total Present
                </th>
                <th className="px-4 py-4 text-center font-bold text-[10px] uppercase tracking-wider text-rose-600 border-r bg-rose-50/50 dark:bg-rose-900/20 min-w-[140px]">
                  Total Absent
                </th>
                <th className="px-4 py-4 text-center font-bold text-[10px] uppercase tracking-wider text-blue-600 bg-blue-50/50 dark:bg-blue-900/20 min-w-[140px]">
                  Total Manpower
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="divide-x">
                {/* Door-wise Counts */}
                {doors.map((door) => {
                  const currentDoorStat = doorStats?.find(s => s.doorId === door.id);
                  return (
                    <td key={door.id} className="px-4 py-6 text-center text-xl font-bold text-slate-700 dark:text-slate-200">
                      {currentDoorStat?.present || 0}
                    </td>
                  );
                })}

                {/* Final Summary Counts */}
                <td className="px-4 py-6 text-center text-2xl font-black text-emerald-500 bg-emerald-50/10">
                  {stats?.activePeople || 0}
                </td>
                <td className="px-4 py-6 text-center text-2xl font-black text-rose-500 bg-rose-50/10">
                  {(stats?.totalPeople || 0) - (stats?.activePeople || 0)}
                </td>
                <td className="px-4 py-6 text-center text-2xl font-black text-blue-600 bg-blue-50/10">
                  {stats?.totalPeople || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ShiftWiseEmpCount({ doors, refreshInterval }: { doors: Door[], refreshInterval: number }) {
  // 1. Shifts fetch karein columns banane ke liye
  const { data: shifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts"],
  });

  // 2. Shift-wise data fetch karein (Backend se doorId aur shiftId ke basis par count)
  const { data: shiftStats } = useQuery<any[]>({
    queryKey: ["/api/attendance/shift-door-stats"],
    refetchInterval: refreshInterval
  });

  return (
    <Card className="col-span-full border-none shadow-sm ring-1 ring-border overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" /> Shift-wise Employee Count
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
                  <th key={shift.id} className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-r min-w-[100px]">
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
                  <tr key={door.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium border-r bg-muted/5">
                      {door.name}
                    </td>

                    {/* Har shift ke liye count dikhayenge */}
                    {shifts.map((shift) => {
                      // Stats array se matching door aur shift ka count nikalna
                      const count = shiftStats?.find(
                        (s) => s.doorId === door.id && s.shiftId === shift.id
                      )?.count || 0;

                      doorTotal += count;

                      return (
                        <td key={shift.id} className="px-4 py-3 text-center border-r font-semibold">
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
    refetchInterval: refreshInterval
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

function SystemHealthCard({ total, online }: { total: number; online: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Device Connectivity
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
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Active Sync</span>
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{online}</span>
        </div>
        <p className="text-[10px] text-center text-muted-foreground pt-1 uppercase font-bold tracking-tighter">
          Hardware Status: <span className="text-emerald-500">Stable</span>
        </p>
      </CardContent>
    </Card>
  );
}