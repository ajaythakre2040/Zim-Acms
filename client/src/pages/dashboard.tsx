import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserCheck, Cpu, Clock, ShieldAlert, BookOpen,
  TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Activity, DoorOpen, ShieldCheck, Sparkles, Wifi, Server
} from "lucide-react";

const statCards = [
  {
    title: "Total People",
    key: "totalPeople",
    icon: Users,
    trend: "+12",
    up: true,
    iconBg: "bg-blue-500",
    lightBg: "bg-blue-50 dark:bg-blue-950/40",
    textColor: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-200 dark:ring-blue-800/40",
    gradientFrom: "from-blue-500",
    gradientTo: "to-indigo-500",
  },
  {
    title: "Active Visitors",
    key: "activeVisitors",
    icon: UserCheck,
    trend: "+3",
    up: true,
    iconBg: "bg-emerald-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/40",
    textColor: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-200 dark:ring-emerald-800/40",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-teal-500",
  },
  {
    title: "Devices Online",
    key: "totalDevices",
    icon: Cpu,
    trend: "0",
    up: true,
    iconBg: "bg-violet-500",
    lightBg: "bg-violet-50 dark:bg-violet-950/40",
    textColor: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-200 dark:ring-violet-800/40",
    gradientFrom: "from-violet-500",
    gradientTo: "to-purple-500",
  },
  {
    title: "Today Attendance",
    key: "todayAttendance",
    icon: Clock,
    trend: "+8",
    up: true,
    iconBg: "bg-amber-500",
    lightBg: "bg-amber-50 dark:bg-amber-950/40",
    textColor: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-200 dark:ring-amber-800/40",
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-500",
  },
  {
    title: "Active Alerts",
    key: "unresolvedAlerts",
    icon: ShieldAlert,
    trend: "-2",
    up: false,
    iconBg: "bg-rose-500",
    lightBg: "bg-rose-50 dark:bg-rose-950/40",
    textColor: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-200 dark:ring-rose-800/40",
    gradientFrom: "from-rose-500",
    gradientTo: "to-red-500",
  },
  {
    title: "Access Logs",
    key: "todayAccessLogs",
    icon: BookOpen,
    trend: "+24",
    up: true,
    iconBg: "bg-teal-500",
    lightBg: "bg-teal-50 dark:bg-teal-950/40",
    textColor: "text-teal-600 dark:text-teal-400",
    ring: "ring-teal-200 dark:ring-teal-800/40",
    gradientFrom: "from-teal-500",
    gradientTo: "to-cyan-500",
  },
];

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/dashboard/stats"] });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md glow-primary">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time overview of your access control system</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
            <div className="relative">
              <Activity className="w-3 h-3 text-emerald-500" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            </div>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">System Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {statCards.map((card, i) => {
          const val = stats?.[card.key] || 0;
          return (
            <Card key={card.title} className={`animate-in animate-in-delay-${i + 1} opacity-0`}>
              <CardContent className="p-4 relative overflow-hidden">
                {isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl ${card.lightBg} flex items-center justify-center ring-1 ${card.ring} transition-transform duration-300`}>
                        <card.icon className={`w-[18px] h-[18px] ${card.textColor}`} />
                      </div>
                      <div className={`flex items-center gap-0.5 text-[10px] font-medium ${card.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {card.trend}
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold tracking-tight" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        {typeof val === "number" ? val.toLocaleString() : val}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{card.title}</p>
                    </div>
                  </div>
                )}
                <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-[0.06]`} />
                <div className={`absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-[0.04]`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <QuickStatsCard />
        </div>
        <div className="md:col-span-1">
          <SystemHealthCard stats={stats} />
        </div>
        <div className="md:col-span-1">
          <RecentAlertsCard />
        </div>
      </div>
    </div>
  );
}

function QuickStatsCard() {
  const { data: summary } = useQuery<any>({ queryKey: ["/api/attendance/summary"] });
  const items = [
    { label: "Present", value: summary?.present || 0, color: "bg-emerald-500", barColor: "bg-emerald-500/20", dot: "text-emerald-500" },
    { label: "Late", value: summary?.late || 0, color: "bg-amber-500", barColor: "bg-amber-500/20", dot: "text-amber-500" },
    { label: "Absent", value: summary?.absent || 0, color: "bg-rose-500", barColor: "bg-rose-500/20", dot: "text-rose-500" },
    { label: "Half Day", value: summary?.halfDay || 0, color: "bg-orange-500", barColor: "bg-orange-500/20", dot: "text-orange-500" },
    { label: "On Leave", value: summary?.onLeave || 0, color: "bg-blue-500", barColor: "bg-blue-500/20", dot: "text-blue-500" },
  ];
  const total = summary?.total || 1;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center ring-1 ring-amber-200 dark:ring-amber-800/40">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Today's Attendance
          </div>
        </CardTitle>
        <Badge variant="secondary">{summary?.total || 0}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <span className="text-xs font-semibold">{item.value}</span>
              </div>
              <div className={`h-1.5 rounded-full ${item.barColor} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SystemHealthCard({ stats }: { stats: any }) {
  const healthItems = [
    { label: "Door Controllers", value: stats?.totalDevices || 0, icon: DoorOpen, iconColor: "text-blue-500", iconBg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Access Points", value: stats?.totalDoors || 0, icon: ShieldCheck, iconColor: "text-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Active Sites", value: stats?.totalSites || 0, icon: Server, iconColor: "text-violet-500", iconBg: "bg-violet-50 dark:bg-violet-950/40" },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center ring-1 ring-emerald-200 dark:ring-emerald-800/40">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            System Health
          </div>
        </CardTitle>
        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 no-default-hover-elevate no-default-active-elevate">
          Healthy
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {healthItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 dark:bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                <item.icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.value} active</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">OK</span>
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Last sync</span>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse-soft" />
              <span className="text-muted-foreground">Just now</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentAlertsCard() {
  const { data: alerts } = useQuery<any[]>({ queryKey: ["/api/alerts"] });
  const recentAlerts = (alerts || []).filter((a: any) => !a.isResolved).slice(0, 4);

  const severityStyles: Record<string, { badge: string; dot: string; iconBg: string }> = {
    critical: { badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400", dot: "bg-rose-500", iconBg: "bg-rose-50 dark:bg-rose-950/40" },
    high: { badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400", dot: "bg-orange-500", iconBg: "bg-orange-50 dark:bg-orange-950/40" },
    medium: { badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", dot: "bg-amber-500", iconBg: "bg-amber-50 dark:bg-amber-950/40" },
    low: { badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", dot: "bg-blue-500", iconBg: "bg-blue-50 dark:bg-blue-950/40" },
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center ring-1 ring-rose-200 dark:ring-rose-800/40">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            Recent Alerts
          </div>
        </CardTitle>
        <Badge variant="secondary">{recentAlerts.length} active</Badge>
      </CardHeader>
      <CardContent>
        {recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-2 ring-1 ring-emerald-200 dark:ring-emerald-800/40">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">All Clear</p>
            <p className="text-xs text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentAlerts.map((alert: any) => {
              const style = severityStyles[alert.severity] || severityStyles.low;
              return (
                <div key={alert.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 dark:bg-muted/20">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{alert.message}</p>
                  </div>
                  <Badge className={`text-[10px] flex-shrink-0 no-default-hover-elevate no-default-active-elevate ${style.badge}`}>
                    {alert.severity}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
