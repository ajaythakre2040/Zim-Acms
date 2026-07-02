import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { Shield, Eye, EyeOff, User, KeyRound, LogIn, RefreshCw } from "lucide-react";
import { useState } from "react";

// Pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import PeoplePage from "@/pages/people";
import PeopleFormPage from "@/pages/PeopleFormPage";
import AttendancePage from "@/pages/attendance";
import AccessLogsPage from "@/pages/access-logs";
import AccessRulesPage from "@/pages/access-rules";
import AccessLevelsPage from "@/pages/access-levels";
import CredentialsPage from "@/pages/credentials";
import AccessCardsPage from "@/pages/access-cards";
import ShiftsPage from "@/pages/shifts";
import HolidaysPage from "@/pages/holidays";
import ExceptionsPage from "@/pages/exceptions";
import SitesPage from "@/pages/sites";
import ZonesDoorsPage from "@/pages/zones";
import DevicesPage from "@/pages/devices";
import AlertsPage from "@/pages/alerts";
import MasterDataPage from "@/pages/master-data";
import UserAdminPage from "@/pages/user-admin";
import SettingsPage from "@/pages/settings";
import ReportsPage from "@/pages/reports";
import CronMasterPage from "@/pages/cronMasterPage";
import ShiftDashboard from "./pages/ShiftDashboard";
import LiveLogsDashboard from "./pages/LiveLogsDashboard";
import DesignationPage from "./pages/designations";
import DepartmentsPage from "./pages/departments";
import RolesPage from "./pages/role";
import MenuPage from "./pages/menu";
import CompaniesPage from "./pages/company";
import CategoriesPage from "./pages/category";
import RoleFormPage from "./pages/role_form";
import RolePermissionViewPage from "./pages/RolePermissionViewPage";
import EmployeeView from "./pages/EmployeeView";
import ContractorView from "./pages/ContractorView";
import Contractors from "./pages/contractors";
import AuditTrailPage from "./pages/audit-trail";
import { useToast } from "./hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePermission } from "./hooks/use-permission";
import { MENU_CONFIG } from "../../server/constant";
import ContractorFormPage from "./pages/ContractorFormPage"; // Aapka form page file path
import visitors from "./pages/visitor-details";
import VisitorLogs from "./pages/VisitorLogs";
import VisitorCards from "./pages/VisitorCards";

function StandardRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/attendance-summary" component={Dashboard} />
      <Route path="/employees" component={PeoplePage} />
      <Route path="/employees/new" component={PeopleFormPage} />
      <Route path="/employees/edit/:id" component={PeopleFormPage} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/access-logs" component={AccessLogsPage} />
      <Route path="/access-rules" component={AccessRulesPage} />
      <Route path="/access-levels" component={AccessLevelsPage} />
      <Route path="/credentials" component={CredentialsPage} />
      <Route path="/access-cards" component={AccessCardsPage} />
      <Route path="/shifts" component={ShiftsPage} />
      <Route path="/holidays" component={HolidaysPage} />
      <Route path="/exceptions" component={ExceptionsPage} />
      <Route path="/sites" component={SitesPage} />
      <Route path="/doors" component={ZonesDoorsPage} />
      <Route path="/devices" component={DevicesPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/master-data" component={MasterDataPage} />
      <Route path="/user-admin" component={UserAdminPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/cron-master" component={CronMasterPage} />
      <Route path="/shift-analytics" component={ShiftDashboard} />
      <Route path="/live-access-logs" component={LiveLogsDashboard} />
      <Route path="/designation" component={DesignationPage} />
      <Route path="/category" component={CategoriesPage} />
      <Route path="/company" component={CompaniesPage} />
      <Route path="/department" component={DepartmentsPage} />
      <Route path="/menu" component={MenuPage} />
      <Route path="/role" component={RolesPage} />
      <Route path="/master-data/roles/add" component={RoleFormPage} />
      <Route path="/master-data/roles/edit/:id" component={RoleFormPage} />
      <Route path="/master-data/roles/view/:id" component={RolePermissionViewPage} />
      <Route path="/employees/view/:id" component={EmployeeView} />
      <Route path="/contractors" component={Contractors} />
      <Route path="/audit-trail" component={AuditTrailPage} />
      <Route path="/contractors/new" component={ContractorFormPage} />
      <Route path="/contractors/edit/:id" component={ContractorFormPage} />
      <Route path="/visitor-details" component={visitors} />
      {/* <Route path="/visitors" component={visitors} /> */}
      {/* <Route path="/visitor-cards" component={VisitorCards} /> */}
      <Route path="/visitor-logs" component={VisitorLogs} />
      <Route path="/visitor-cards" component={VisitorCards} />
      <Route path="/contractors/view/:id" component={ContractorView} />

      <Route component={NotFound} />
    </Switch>
  );
}

function LoginPage({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const { login, loginError, isLoggingIn } = auth;
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ username, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6]">
      <div className="w-full max-w-lg mx-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center p-2">
              {/* <img src="/zim_logo.png" alt="Zim Logo" className="w-full h-full object-contain" /> */}
              <img
                src="/zim_logo.png"
                alt="ZIM Logo"
                className="w-full h-full object-contain p-1 cursor-pointer animate-pulse transition-transform duration-500 hover:animate-none hover:rotate-[360deg]"
              />
               </div>
          </div>
          <h1 className="text-3xl font-bold text-[#4c51bf] mb-2">ZIM Laboratories Limited</h1>
          <p className="text-gray-500">Attendance Cum Access Control System</p>
        </div>

        <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 h-11 bg-gray-50" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11 bg-gray-50" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {loginError && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{loginError}</div>}
            <Button type="submit" className="w-full h-11 bg-[#5c54d5] hover:bg-[#4c44c5] text-white shadow-md" disabled={isLoggingIn}>
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account? Please contact the <span className="text-[#5c54d5] font-medium">System Administrator</span> to register your profile.
          </div>
          <div className="mt-6 flex justify-center items-center text-gray-400 text-xs">
            &copy; {new Date().getFullYear()} ZIM Laboratories Limited. All rights reserved.
          </div>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-400">

      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { toast } = useToast();
  const [isEmergencyAlertOpen, setIsEmergencyAlertOpen] = useState(false);

  const handleLogout = () => {
    fetch("/api/logout", { method: "POST" }).then(() => window.location.reload());
  };

  const bulkEmergencyUnblockMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/emergency/bulk-unblock", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({ title: "Success", description: res.message });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  return (
    <>
      <AlertDialog open={isEmergencyAlertOpen} onOpenChange={setIsEmergencyAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger Emergency Unblock?</AlertDialogTitle>
            <AlertDialogDescription>This will UNBLOCK ALL doors.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkEmergencyUnblockMut.mutate()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between px-4 py-2 border-b">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="destructive" size="sm" onClick={() => setIsEmergencyAlertOpen(true)}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Emergency
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </header>
            <main className="flex-1 overflow-auto"><StandardRouter /></main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

function AppContent() {
  const auth = useAuth();
  const { user, isLoading } = auth;
  if (isLoading) return null;
  return !user ? <LoginPage auth={auth} /> : <AuthenticatedApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider><ConfirmProvider><AppContent /><Toaster /></ConfirmProvider></TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}