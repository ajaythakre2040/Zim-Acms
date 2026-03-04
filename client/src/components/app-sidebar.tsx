import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, UserCheck, Clock, DoorOpen, Cpu,
  Building2, Shield, Key, CalendarDays, Calendar, Bell, FileWarning,
  Settings, UserCog, MapPin, Layers, CreditCard, BookOpen, LogOut, ChevronRight,
  Zap, FileText
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navGroups = [
  {
    label: "Overview",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, iconColor: "text-blue-400" },
    ],
  },
  {
    label: "People",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
    items: [
      { title: "People", url: "/people", icon: Users, iconColor: "text-cyan-400" },
      { title: "Visitors", url: "/visitors", icon: UserCheck, iconColor: "text-teal-400" },
    ],
  },
  {
    label: "Access Control",
    color: "text-violet-400",
    bgColor: "bg-violet-500/15",
    items: [
      { title: "Access Logs", url: "/access-logs", icon: BookOpen, iconColor: "text-violet-400" },
      { title: "Access Rules", url: "/access-rules", icon: Shield, iconColor: "text-purple-400" },
      { title: "Access Levels", url: "/access-levels", icon: Layers, iconColor: "text-indigo-400" },
      { title: "Credentials", url: "/credentials", icon: Key, iconColor: "text-fuchsia-400" },
      { title: "Access Cards", url: "/access-cards", icon: CreditCard, iconColor: "text-pink-400" },
    ],
  },
  {
    label: "Time & Attendance",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    items: [
      { title: "Attendance", url: "/attendance", icon: Clock, iconColor: "text-amber-400" },
      { title: "Shifts", url: "/shifts", icon: CalendarDays, iconColor: "text-orange-400" },
      { title: "Holidays", url: "/holidays", icon: Calendar, iconColor: "text-yellow-400" },
      { title: "Exceptions", url: "/exceptions", icon: FileWarning, iconColor: "text-red-400" },
    ],
  },
  {
    label: "Reports",
    color: "text-pink-400",
    bgColor: "bg-pink-500/15",
    items: [
      { title: "Reports", url: "/reports", icon: FileText, iconColor: "text-pink-400" },
    ],
  },
  {
    label: "Infrastructure",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    items: [
      { title: "Sites", url: "/sites", icon: MapPin, iconColor: "text-emerald-400" },
      { title: "Zones & Doors", url: "/zones", icon: DoorOpen, iconColor: "text-green-400" },
      { title: "Devices", url: "/devices", icon: Cpu, iconColor: "text-lime-400" },
    ],
  },
  {
    label: "System",
    color: "text-rose-400",
    bgColor: "bg-rose-500/15",
    items: [
      { title: "Alerts", url: "/alerts", icon: Bell, iconColor: "text-rose-400" },
      { title: "Master Data", url: "/master-data", icon: Building2, iconColor: "text-slate-400" },
      { title: "User Admin", url: "/user-admin", icon: UserCog, iconColor: "text-sky-400" },
      { title: "Settings", url: "/settings", icon: Settings, iconColor: "text-zinc-400" },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const initials = user ? `${(user.firstName || "U")[0]}${(user.lastName || "")[0] || ""}` : "?";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl gradient-primary shadow-md glow-primary">
            <Shield className="w-5 h-5 text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sidebar animate-pulse-soft" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight" data-testid="text-app-name">ZIM-ACMS</span>
            <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              Access Control
            </span>
          </div>
        </div>
      </SidebarHeader>
      <Separator className="bg-sidebar-border" />
      <SidebarContent className="py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-4 flex items-center gap-1.5">
              <div className={`w-1 h-1 rounded-full ${group.color}`} />
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive} className="mx-2 rounded-lg">
                        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                          <div className={`flex items-center justify-center w-6 h-6 rounded-md ${isActive ? group.bgColor : "bg-transparent"} transition-colors duration-200`}>
                            <item.icon className={`w-3.5 h-3.5 ${isActive ? item.iconColor : "text-sidebar-foreground/60"} transition-colors duration-200`} />
                          </div>
                          <span className="text-[13px]">{item.title}</span>
                          {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <Separator className="bg-sidebar-border" />
      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="w-8 h-8 border-2 border-primary/30">
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-accent/30 text-primary-foreground font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium truncate text-sidebar-foreground" data-testid="text-user-name">
              {user?.firstName || "User"} {user?.lastName || ""}
            </span>
            <span className="text-[10px] text-sidebar-foreground/50 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-sidebar-foreground/50"
            onClick={() => { fetch("/api/logout", { method: "POST", credentials: "include" }).then(() => window.location.reload()); }}
            data-testid="button-sidebar-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
