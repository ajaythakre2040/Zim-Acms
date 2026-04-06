import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Activity,
  DoorOpen,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  Server,
} from "lucide-react";
import type { Device } from "@shared/schema";

export default function Dashboard() {
  // 1. Dashboard General Stats (People, Alerts)
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  // 2. Devices Data (Aapke DevicesPage wali API)
  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Logic: Device counts calculate karna
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const offlineDevices = devices.filter((d) => d.status === "offline").length;
  const erroredDevices = devices.filter((d) => d.status === "error").length;

  const isLoading = statsLoading || devicesLoading;

  // Stat Cards ki Configuration (Unique & Clean)
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
      title: "Currently Inside",
      value: stats?.activePeople || 0,
      icon: UserCheck,
      lightBg: "bg-emerald-50 dark:bg-emerald-950/40",
      textColor: "text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-200 dark:ring-emerald-800/40",
      gradient: "from-emerald-500 to-teal-500",
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
      title: "Devices Online",
      value: onlineDevices,
      icon: Wifi,
      lightBg: "bg-amber-50 dark:bg-amber-950/40",
      textColor: "text-amber-600 dark:text-amber-400",
      ring: "ring-amber-200 dark:ring-amber-800/40",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Devices Offline",
      value: offlineDevices,
      icon: WifiOff,
      lightBg: "bg-slate-100 dark:bg-slate-900",
      textColor: "text-slate-600 dark:text-slate-400",
      ring: "ring-slate-200 dark:ring-slate-800",
      gradient: "from-slate-400 to-slate-600",
    },
    {
      title: "Active Alerts",
      value: stats?.unresolvedAlerts || erroredDevices,
      icon: ShieldAlert,
      lightBg: "bg-rose-50 dark:bg-rose-950/40",
      textColor: "text-rose-600 dark:text-rose-400",
      ring: "ring-rose-200 dark:ring-rose-800/40",
      gradient: "from-rose-500 to-red-500",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time biometric and hardware overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
          <Activity className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 tracking-tight">System Online</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Stats Grid - 6 Columns on Desktop */}
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

      {/* Main Grid for Details */}
      <div className="grid md:grid-cols-3 gap-4">
        <AttendanceCard />
        <SystemHealthCard total={totalDevices} online={onlineDevices} />
        <RecentAlertsCard />
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function AttendanceCard() {
  const { data: summary } = useQuery<any>({ queryKey: ["/api/attendance/summary"] });
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

function RecentAlertsCard() {
  const { data: alerts = [] } = useQuery<any[]>({ queryKey: ["/api/alerts"] });
  const active = alerts.filter(a => !a.isResolved).slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" /> System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-xs italic">
            No active threats
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((alert, i) => (
              <div key={i} className="p-2 rounded border-l-4 border-rose-500 bg-rose-50/30 dark:bg-rose-950/10">
                <p className="text-[10px] font-bold truncate">{alert.title}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(alert.createdAt).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}