import { useLocation, Link } from "wouter";
import { useMemo } from "react";
import * as LucideIcons from "lucide-react";
import {
  Shield,
  Zap,
  ChevronDown,
  LogOut,
  LucideIcon,
  Circle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
import { MENU_CONFIG } from "../../../server/constant";

interface MenuPermission {
  permissionId: number;
  menuId: number;
  title: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  code: string;
  view: boolean;
}

interface AuthUser {
  id: string;
  username: string | null;
  fullName: string | null;
  roleName?: string;
  menuPermissions?: MenuPermission[];
}

const groupStyles: Record<string, { color: string; bgColor: string }> = {
  Overview: { color: "text-blue-400", bgColor: "bg-blue-500/15" },
  Employees: { color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
  "Shifts & Holidays": { color: "text-amber-400", bgColor: "bg-amber-500/15" },
  Reports: { color: "text-pink-400", bgColor: "bg-pink-500/15" },
  Automation: { color: "text-orange-400", bgColor: "bg-orange-500/15" },
  Infrastructure: { color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
  System: { color: "text-rose-400", bgColor: "bg-rose-500/15" },
  Default: { color: "text-slate-400", bgColor: "bg-slate-500/15" },
};

const getUrlPath = (title: string) => {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
};

const getIcon = (name: string | null): LucideIcon => {
  if (!name) return Circle;
  return (LucideIcons as any)[name] || Circle;
};

export function AppSidebar() {
  const [location] = useLocation();
  const auth = useAuth();

  const user = auth.user as AuthUser | null;

  const initials = user
    ? `${(user.fullName || "U")[0]}`
    : "?";

  const navGroups = useMemo(() => {
    if (!user?.menuPermissions) return [];

    const visiblePermissions = user.menuPermissions.filter(
      (item) => item.view === true && item.code !== MENU_CONFIG.EMERGENCY_UNBLOCK.code
    );
    const map: Record<number, any> = {};
    const roots: any[] = [];

    visiblePermissions.forEach((item) => {
      map[item.menuId] = {
        ...item,
        renderIcon: getIcon(item.icon),
        urlPath: `/${getUrlPath(item.title)}`,
        subItems: [],
      };
    });

    visiblePermissions.forEach((item) => {
      if (item.parentId && item.parentId !== 0 && map[item.parentId]) {
        map[item.parentId].subItems.push(map[item.menuId]);
      } else if (!item.parentId || item.parentId === 0) {
        roots.push(map[item.menuId]);
      }
    });

    return roots.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [user?.menuPermissions]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            {/* <img
              src="/zim_logo.png"
              alt="ZIM Logo"
              className="w-full h-full object-contain p-1"
            /> */}
            <img
              src="/zim_logo.png"
              alt="ZIM Logo"
              className="w-full h-full object-contain p-1 cursor-pointer animate-pulse transition-transform duration-500 hover:animate-none hover:rotate-[360deg]"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight uppercase">
              ZIM-ACMS
            </span>
            <span className="text-[9px] text-sidebar-foreground/50 uppercase tracking-widest flex items-center gap-1 font-semibold">
              <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              Access Control
            </span>
          </div>
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border/50" />

      <SidebarContent className="py-2 scrollbar-none">
        {navGroups.map((group) => {
          const styles = groupStyles[group.title] || groupStyles["Default"];
          const hasSubItems = group.subItems && group.subItems.length > 0;

          const isAnySubActive = group.subItems?.some(
            (sub: any) => location === sub.urlPath
          );
          const isActive = location === group.urlPath || isAnySubActive;

          return (
            <SidebarGroup key={group.menuId} className="py-1">
              <SidebarGroupLabel className="text-[10px] uppercase tracking-tighter text-sidebar-foreground/40 font-bold px-4 flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full ${styles.color} shadow-sm`} />
                {group.title}
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {hasSubItems ? (
                    <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="mx-2 rounded-lg transition-all duration-200">
                            <div className="flex items-center justify-center w-6 h-6">
                              <group.renderIcon className={`w-4 h-4 ${isActive ? styles.color : "text-sidebar-foreground/60 opacity-70"}`} />
                            </div>
                            <span className={`text-[13px] font-medium ${isActive ? "text-sidebar-foreground font-semibold" : "text-sidebar-foreground/80"}`}>
                              {group.title}
                            </span>
                            <ChevronDown className="ml-auto w-3 h-3 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180 opacity-40" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-6 border-l border-sidebar-border/60 pl-2 mt-1 space-y-1">
                            {group.subItems.map((sub: any) => {
                              const isSubActive = location === sub.urlPath;
                              return (
                                <SidebarMenuSubItem key={sub.menuId}>
                                  <SidebarMenuSubButton asChild isActive={isSubActive} className="h-8 transition-colors">
                                    <Link
                                      href={sub.urlPath}
                                      className={`text-[12px] w-full block ${isSubActive ? "font-bold text-blue-500" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"}`}
                                    >
                                      {sub.title}
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild data-active={isActive} className="mx-2 rounded-lg group">
                        <Link href={group.urlPath} className="flex items-center gap-2 w-full">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-md ${isActive ? styles.bgColor : "bg-transparent group-hover:bg-sidebar-accent/50"} transition-all duration-200`}>
                            <group.renderIcon className={`w-4 h-4 ${isActive ? styles.color : "text-sidebar-foreground/60 opacity-70"}`} />
                          </div>
                          <span className={`text-[13px] font-medium ${isActive ? "text-sidebar-foreground font-semibold" : "text-sidebar-foreground/80"}`}>
                            {group.title}
                          </span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
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
              {user?.fullName || "System"}
            </span>
            <span className="text-[9px] text-emerald-500 font-medium flex items-center gap-1 leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>
          <Button
            size="icon" variant="ghost"
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