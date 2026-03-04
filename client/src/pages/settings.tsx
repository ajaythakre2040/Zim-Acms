import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Save, Database, RefreshCw, Server,
  CheckCircle2, XCircle, Loader2, Shield, Cable,
  Info, AlertTriangle, HardDrive, Network, SlidersHorizontal, WifiOff
} from "lucide-react";
import type { SystemSetting } from "@shared/schema";

function ConnectionCard({
  title,
  description,
  type,
  icon: Icon,
  iconColor,
  fields,
  savedConfig,
}: {
  title: string;
  description: string;
  type: string;
  icon: any;
  iconColor: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  savedConfig?: any;
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      next[f.key] = savedConfig?.[f.key] || "";
    });
    setConfig(next);
  }, [savedConfig]);

  const testMut = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/external-connections/test", { type, config });
      return r.json();
    },
    onSuccess: (data: any) => {
      setTestResult(data);
      toast({
        title: data.success ? "Connection Reachable" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (e: Error) => {
      setTestResult({ success: false, message: e.message });
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/external-connections/save", { type, config });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      toast({ title: "Configuration Saved", description: `${title} connection settings saved successfully.` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const hasValues = fields.some((f) => config[f.key]?.trim());

  return (
    <Card data-testid={`card-connection-${type}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center ${iconColor} shadow-sm`}>
              <Icon className="w-5 h-5 text-white" />
              {savedConfig && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-card flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          {savedConfig ? (
            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${type}`}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
            </Badge>
          ) : (
            <Badge variant="secondary" data-testid={`badge-status-${type}`}>
              <WifiOff className="w-3 h-3 mr-1" /> Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-medium">{field.label}</Label>
              <Input
                type={field.type || "text"}
                value={config[field.key] || ""}
                onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                data-testid={`input-${type}-${field.key}`}
              />
            </div>
          ))}
        </div>

        {testResult && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
            testResult.success
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300"
          }`} data-testid={`text-result-${type}`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => testMut.mutate()}
            disabled={!hasValues || testMut.isPending}
            data-testid={`button-test-${type}`}
          >
            {testMut.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Test Reachability
          </Button>
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={!hasValues || saveMut.isPending}
            data-testid={`button-save-${type}`}
          >
            {saveMut.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Save Configuration
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          {type === "zkteco"
            ? "Tests TCP/IP reachability to the controller. Full protocol communication requires the controller to be online."
            : "Tests TCP reachability to the SQL Server port. Full database authentication requires valid credentials and network access."}
        </p>
      </CardContent>
    </Card>
  );
}

function IntegrationGuide() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            How to Connect External Systems
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <span className="text-xs font-bold text-white">1</span>
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-guide-essl">ESSL Database (SQL Server)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ESSL attendance devices store data in a Microsoft SQL Server database (typically 100+ tables).
                  To connect: provide the SQL Server host IP, port (default 1433), database name, and credentials.
                  The ESSL software must be installed and its database accessible over the network.
                  Common database names: eSSLTimeTrackLite, eTimeTrackLite, or custom names.
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <span className="text-xs font-bold text-white">2</span>
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-guide-bios">BIOS Database (SQL Server / SSMS)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  BIOS biometric systems use SQL Server (managed via SSMS) for storage (approximately 37 tables).
                  The BIOS database is on the same network, so connectivity should be straightforward.
                  Connect using the SQL Server host IP, port (default 1433), database name, and credentials.
                  Open SSMS to verify the database name, instance, and that SQL authentication is enabled.
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <span className="text-xs font-bold text-white">3</span>
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-guide-zkteco">ZKTeco C3-400 Controller</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ZKTeco C3-400 is a 4-door access controller that communicates via TCP/IP.
                  It connects directly over your local network -- no SQL Server required.
                  You need the controller's static IP address and communication port (default 4370).
                  The controller must be on the same network or routable from this server.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Network Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/40 dark:bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">SQL Server (ESSL / BIOS)</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Port 1433 (or custom) must be open</li>
                <li>TCP/IP protocol enabled in SQL Config Manager</li>
                <li>SQL Server Authentication mode enabled</li>
                <li>Firewall rules allow inbound connections</li>
                <li>Database user with read permissions created</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 dark:bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">ZKTeco Controller</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Static IP assigned to controller</li>
                <li>Port 4370 (default) accessible</li>
                <li>Same subnet or VPN/routing configured</li>
                <li>Controller firmware is up to date</li>
                <li>Communication password configured (if required)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settings = [] } = useQuery<SystemSetting[]>({ queryKey: ["/api/system-settings"] });

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const upsertMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/system-settings", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] }); toast({ title: "Setting saved" }); setNewKey(""); setNewValue(""); setNewDesc(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (!newKey.trim()) return;
    let parsedValue: any = newValue;
    try { parsedValue = JSON.parse(newValue); } catch {}
    upsertMut.mutate({ key: newKey, value: parsedValue, description: newDesc || undefined });
  };

  const esslConfig = settings.find((s) => s.key === "external_connection_essl")?.value as any;
  const biosConfig = settings.find((s) => s.key === "external_connection_bios")?.value as any;
  const zktecoConfig = settings.find((s) => s.key === "external_connection_zkteco")?.value as any;

  const esslFields = [
    { key: "host", label: "Server Host / IP", placeholder: "192.168.1.100" },
    { key: "port", label: "Port", placeholder: "1433" },
    { key: "database", label: "Database Name", placeholder: "eTimeTrackLite" },
    { key: "instance", label: "Instance Name (optional)", placeholder: "SQLEXPRESS" },
    { key: "username", label: "Username", placeholder: "sa" },
    { key: "password", label: "Password", placeholder: "Password", type: "password" },
  ];

  const biosFields = [
    { key: "host", label: "Server Host / IP", placeholder: "192.168.1.101" },
    { key: "port", label: "Port", placeholder: "1433" },
    { key: "database", label: "Database Name", placeholder: "BIOS_DB" },
    { key: "instance", label: "Instance Name (optional)", placeholder: "SQLEXPRESS" },
    { key: "username", label: "Username", placeholder: "sa" },
    { key: "password", label: "Password", placeholder: "Password", type: "password" },
  ];

  const zktecoFields = [
    { key: "host", label: "Controller IP Address", placeholder: "192.168.1.201" },
    { key: "port", label: "Communication Port", placeholder: "4370" },
    { key: "serialNumber", label: "Serial Number", placeholder: "C3-400 Serial" },
    { key: "model", label: "Model", placeholder: "C3-400" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader title="System Settings" description="Configure system parameters and external integrations" />

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList data-testid="tabs-settings">
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Cable className="w-3.5 h-3.5 mr-1.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="guide" data-testid="tab-guide">
            <Info className="w-3.5 h-3.5 mr-1.5" />
            Setup Guide
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <ConnectionCard
            title="ESSL Database"
            description="Microsoft SQL Server - Attendance device data (100+ tables)"
            type="essl"
            icon={HardDrive}
            iconColor="bg-gradient-to-br from-blue-500 to-indigo-600"
            fields={esslFields}
            savedConfig={esslConfig}
          />
          <ConnectionCard
            title="BIOS Database"
            description="SQL Server (SSMS) - Biometric system on same network (37 tables)"
            type="bios"
            icon={Database}
            iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
            fields={biosFields}
            savedConfig={biosConfig}
          />
          <ConnectionCard
            title="ZKTeco C3-400 Controller"
            description="TCP/IP - 4-door access controller direct communication"
            type="zkteco"
            icon={Shield}
            iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
            fields={zktecoFields}
            savedConfig={zktecoConfig}
          />
        </TabsContent>

        <TabsContent value="guide">
          <IntegrationGuide />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Add / Update Setting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Key</Label>
                  <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="setting_key" data-testid="input-setting-key" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What this setting does" data-testid="input-setting-desc" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Value (JSON or plain text)</Label>
                <Textarea value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder='e.g. "value" or {"key": "val"}' data-testid="textarea-setting-value" />
              </div>
              <Button onClick={handleSave} disabled={upsertMut.isPending} data-testid="button-save-setting">
                <Save className="w-4 h-4 mr-1" /> Save Setting
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Current Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {settings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-settings">No settings configured</p>
              ) : (
                <div className="space-y-2">
                  {settings.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-2 p-3 rounded-md bg-muted/50" data-testid={`setting-item-${s.key}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">{s.key}</span>
                          {s.description && <span className="text-xs text-muted-foreground">- {s.description}</span>}
                        </div>
                        <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-all">
                          {typeof s.value === "object" ? JSON.stringify(s.value, null, 2) : String(s.value)}
                        </pre>
                      </div>
                      <Button size="sm" variant="ghost" data-testid={`button-edit-${s.key}`} onClick={() => { setNewKey(s.key); setNewValue(typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value || "")); setNewDesc(s.description || ""); }}>
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
