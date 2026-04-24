import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, UserCheck, Clock, DoorOpen, Cpu,
  Building2, Shield, Key, CalendarDays, Calendar, Bell, FileWarning,
  Settings, UserCog, MapPin, Layers, CreditCard, BookOpen, LogOut, ChevronRight,
  Zap, FileText, Timer, LucideIcon, Siren, ChevronDown, Activity
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// --- Types ---
interface SubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  iconColor: string;
  items?: SubItem[];
}

interface NavGroup {
  label: string;
  color: string;
  bgColor: string;
  items: NavItem[];
}

// --- Navigation Configuration ---
const navGroups: NavGroup[] = [
  {
    label: "Overview",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        iconColor: "text-blue-400",
        items: [
          { title: "Attendance Summary", url: "/" },
          { title: "Shift Analytics", url: "/shift-dashboard" },
          { title: "Live Access Logs", url: "/live-logs" },
        ]
      },
    ],
  },
  {
    label: "Employees",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
    items: [
      { title: "Employees", url: "/people", icon: Users, iconColor: "text-cyan-400" },
    ],
  },
  {
    label: "Time & Holidays",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    items: [
      { title: "Shifts", url: "/shifts", icon: CalendarDays, iconColor: "text-orange-400" },
      { title: "Holidays", url: "/holidays", icon: Calendar, iconColor: "text-yellow-400" },
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
    label: "Automation",
    color: "text-orange-400",
    bgColor: "bg-orange-500/15",
    items: [
      { title: "Cron Master", url: "/cron-master", icon: Timer, iconColor: "text-orange-400" },
    ],
  },
  {
    label: "Infrastructure",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    items: [
      // { title: "Sites", url: "/sites", icon: MapPin, iconColor: "text-emerald-400" },
      { title: "Doors", url: "/zones", icon: DoorOpen, iconColor: "text-green-400" },
      { title: "Devices", url: "/devices", icon: Cpu, iconColor: "text-lime-400" },
    ],
  },
  {
    label: "System",
    color: "text-rose-400",
    bgColor: "bg-rose-500/15",
    items: [
      { title: "Master Data", url: "/master-data", icon: Building2, iconColor: "text-slate-400" },
      { title: "User Admin", url: "/user-admin", icon: UserCog, iconColor: "text-sky-400" },
      // { title: "Settings", url: "/settings", icon: Settings, iconColor: "text-zinc-400" },
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
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
            <Shield className="w-5 h-5 text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sidebar animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight uppercase">ZIM-ACMS</span>
            <span className="text-[9px] text-sidebar-foreground/50 uppercase tracking-widest flex items-center gap-1 font-semibold">
              <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              Access Control
            </span>
          </div>
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border/50" />

      <SidebarContent className="py-2 scrollbar-none">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-tighter text-sidebar-foreground/40 font-bold px-4 flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full ${group.color} shadow-sm`} />
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const hasSubItems = item.items && item.items.length > 0;
                  const isAnySubActive = item.items?.some(sub => location === sub.url);
                  const isActive = location === item.url || isAnySubActive;

                  if (hasSubItems) {
                    return (
                      <Collapsible
                        key={item.title}
                        asChild
                        defaultOpen={isActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="mx-2 rounded-lg transition-all duration-200">
                              <div className={`flex items-center justify-center w-6 h-6`}>
                                <item.icon className={`w-4 h-4 ${isActive ? item.iconColor : "text-sidebar-foreground/60 opacity-70"}`} />
                              </div>
                              <span className={`text-[13px] font-medium ${isActive ? "text-sidebar-foreground font-semibold" : "text-sidebar-foreground/80"}`}>
                                {item.title}
                              </span>
                              <ChevronDown className="ml-auto w-3 h-3 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180 opacity-40" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="transition-all duration-300">
                            <SidebarMenuSub className="ml-6 border-l border-sidebar-border/60 pl-2 mt-1 space-y-1">
                              {item.items?.map((subItem) => {
                                const isSubActive = location === subItem.url;
                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    {/* Link added here */}
                                    <SidebarMenuSubButton asChild isActive={isSubActive} className="h-8 transition-colors">
                                      <Link href={subItem.url}>
                                        <a className={`text-[12px] w-full ${isSubActive ? "font-bold text-blue-500" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"}`}>
                                          {subItem.title}
                                        </a>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive} className="mx-2 rounded-lg group">
                        <Link href={item.url}>
                          <a className="flex items-center gap-2 w-full">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-md ${isActive ? group.bgColor : "bg-transparent group-hover:bg-sidebar-accent/50"} transition-all duration-200`}>
                              <item.icon className={`w-4 h-4 ${isActive ? item.iconColor : "text-sidebar-foreground/60 opacity-70"}`} />
                            </div>
                            <span className={`text-[13px] font-medium ${isActive ? "text-sidebar-foreground font-semibold" : "text-sidebar-foreground/80"}`}>
                              {item.title}
                            </span>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                          </a>
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

      <Separator className="bg-sidebar-border/50" />

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-sidebar-accent/30 border border-sidebar-border/40 backdrop-blur-sm">
          <Avatar className="w-8 h-8 border border-primary/20 shadow-sm">
            <AvatarFallback className="text-[10px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 text-primary font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold truncate text-sidebar-foreground">
              {user?.firstName || "System"} {user?.lastName || "Admin"}
            </span>
            <span className="text-[9px] text-emerald-500 font-medium flex items-center gap-1 leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-sidebar-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-lg"
            onClick={() => {
              fetch("/api/logout", { method: "POST", credentials: "include" })
                .then(() => window.location.reload());
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}