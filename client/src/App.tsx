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
import { Shield, Lock, Fingerprint, ScanLine, Sparkles, Radio, User, KeyRound, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import PeoplePage from "@/pages/people";
import VisitorsPage from "@/pages/visitors";
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
import CronMasterPage from "@/pages/CronMasterPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/people" component={PeoplePage} />
      <Route path="/visitors" component={VisitorsPage} />
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
      <Route path="/zones" component={ZonesDoorsPage} />
      <Route path="/devices" component={DevicesPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/master-data" component={MasterDataPage} />
      <Route path="/user-admin" component={UserAdminPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/cron-master" component={CronMasterPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function LoginPage({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const { login, loginError, isLoggingIn, register, registerError, isRegistering } = auth;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await login({ username, password });
    } else {
      await register({ username, password, email: email || undefined, firstName: firstName || undefined, lastName: lastName || undefined });
    }
  };

  const error = mode === "login" ? loginError : registerError;
  const isPending = mode === "login" ? isLoggingIn : isRegistering;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary opacity-[0.03] dark:opacity-[0.06]" />
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent/5 dark:bg-accent/10 blur-3xl animate-float animate-float-delay-2" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-primary/3 dark:bg-primary/6 blur-2xl animate-float animate-float-delay-1" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-in">
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-18 h-18 mb-4">
            <div className="absolute inset-0 w-[72px] h-[72px] rounded-2xl gradient-primary opacity-20 blur-lg animate-pulse-soft" />
            <div className="relative w-[72px] h-[72px] rounded-2xl gradient-primary shadow-lg glow-primary flex items-center justify-center">
              <Shield className="w-9 h-9 text-white" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-background flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-login-title">
            <span className="gradient-text">ZIM-ACMS</span>
          </h1>
          <p className="text-muted-foreground mt-1">Enterprise Access Control Management</p>
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-6">
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30" data-testid="feature-biometric">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm animate-float">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">Biometric</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/30" data-testid="feature-card-access">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm animate-float animate-float-delay-1">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-violet-700 dark:text-violet-300">Card Access</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30" data-testid="feature-door-control">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm animate-float animate-float-delay-2">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Door Control</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            {mode === "register" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs font-medium">First Name</Label>
                    <Input id="firstName" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-firstName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs font-medium">Last Name</Label>
                    <Input id="lastName" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} data-testid="input-lastName" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                  <Input id="email" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
                </div>
              </>
            )}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3" data-testid="text-auth-error">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full gradient-primary border-0 text-white shadow-md" disabled={isPending} data-testid="button-login">
              {isPending ? (
                <Radio className="w-4 h-4 mr-2 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {isPending ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-xs text-primary hover:underline"
              data-testid="button-toggle-auth-mode"
            >
              {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign In"}
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3" />
            Secured with enterprise-grade encryption
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => { fetch("/api/logout", { method: "POST", credentials: "include" }).then(() => window.location.reload()); }} data-testid="button-logout">
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const auth = useAuth();
  const { user, isLoading } = auth;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full gradient-primary opacity-20 animate-ping absolute inset-0" />
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center relative">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse-soft">Loading ZIM-ACMS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage auth={auth} />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
