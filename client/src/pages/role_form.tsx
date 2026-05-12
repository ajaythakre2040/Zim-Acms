import { useEffect, useState, useMemo, Fragment } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Save, ShieldCheck, LayoutGrid,
  CheckCircle2, AlertCircle, XCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

export default function RoleFormPage() {

  const { id } = useParams();
  const roleId = id;
  const isEdit = !!roleId;
  const [, navigate] = useLocation();
  const { canAdd, canEdit, canView, isLoading: isPermLoading } = usePermission(MENU_CONFIG.ROLE.code); const hasAccess = isEdit ? canEdit : canAdd;
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({
    roleName: "",
    code: "",
    description: "",
    isActive: true,
  });

  const [permissions, setPermissions] = useState<any>({});
  const permissionTypes = ["view", "add", "edit", "delete", "print", "export"];

  // ✅ Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ✅ Fetch Menus
  const { data: menus = [], isLoading: isMenuLoading } = useQuery({
    queryKey: ["menus"],
    queryFn: async () => {
      const res = await fetch("/api/menus");
      return res.json();
    },
    enabled: hasAccess,
  });

  // ✅ Fetch Role & Permissions for Edit
  useEffect(() => {
    if (!roleId) return;
    const fetchRole = async () => {
      try {
        const res = await fetch(`/api/roles-with-permissions/${roleId}`);
        const data = await res.json();
        setForm({
          roleName: data.roleName || "",
          code: data.code || "",
          description: data.description || "",
          isActive: data.isActive ?? true,
        });

        const permMap: any = {};
        if (data.permissions && Array.isArray(data.permissions)) {
          data.permissions.forEach((p: any) => {
            if (!p.menuId) return;
            permMap[p.menuId] = {
              view: !!p.view, add: !!p.add, edit: !!p.edit,
              delete: !!p.delete, print: !!p.print, export: !!p.export,
            };
          });
        }
        setPermissions(permMap);
      } catch (error) {
        console.error("Error fetching role permissions:", error);
      }
    };
    fetchRole();
  }, [roleId]);

  const groupedMenus = useMemo(() => {
    return menus.map((parent: any) => ({
      ...parent,
      children: parent.subMenus || [],
    }));
  }, [menus]);

  const handlePermission = (menuId: number, type: string, value: boolean) => {
    setPermissions((prev: any) => ({
      ...prev,
      [menuId]: { ...prev[menuId], [type]: value },
    }));
  };

  // ✅ SUBMIT LOGIC WITH PROPER ERROR HANDLING
  const handleSubmit = async () => {
    try {
      if (!form.roleName.trim() || !form.code.trim()) {
        setToast({ message: "Role Name and Code are required", type: "error" });
        return;
      }

      const payload = {
        role: { ...form },
        permissions: Object.entries(permissions).map(([menuId, perms]: any) => ({
          menuId: Number(menuId),
          ...perms,
        })),
      };

      const url = isEdit ? `/api/roles-with-permissions/${roleId}` : "/api/roles-with-permissions";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json(); // Parse the response body first

      if (!res.ok) {
        // Backend se aane wala "message" handle karein (Duplicate Check)
        throw new Error(result.message || "Failed to save role configuration");
      }

      setToast({ message: "Role saved successfully!", type: "success" });
      setTimeout(() => navigate("/role"), 1500);
    } catch (err: any) {
      setToast({
        message: err.message || "An unexpected error occurred",
        type: "error"
      });
    }
  };
  // ==========================================================
  // 🛡️ SECURITY CHECK & LOADING UI
  // ==========================================================

  // 1. Loading State
  if (isPermLoading || isMenuLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // 2. Access Denied State ✅ (YAHAN DALA HAI)
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-slate-500 mt-2 text-sm">
            You do not have permission to {isEdit ? "edit" : "create"} role configurations.
            Please contact your administrator for access.
          </p>
          <Button
            className="mt-6 w-full bg-slate-900"
            onClick={() => navigate("/role")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Roles
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/role")}
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all mr-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </Button>
          <div className="h-6 w-[1px] bg-slate-200 mr-4" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {isEdit ? "Edit Role Configuration" : "Create New Role"}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Define access levels and system permissions</p>
          </div>
        </div>

        {/* TOAST NOTIFICATION (UPGRADED) */}
        {toast && (
          <div className={`fixed top-8 right-8 px-6 py-4 rounded-2xl shadow-2xl text-white text-sm z-[100] animate-in fade-in slide-in-from-top-4 duration-300 min-w-[300px] border-b-4 ${toast.type === "success" ? "bg-emerald-600 border-emerald-800" : "bg-rose-600 border-rose-800"
            }`}>
            <div className="flex items-center gap-4">
              {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <div className="flex-1">
                <p className="font-bold tracking-wide uppercase text-[10px] opacity-80">
                  {toast.type === "success" ? "Success" : "System Error"}
                </p>
                <p className="font-medium text-white/90">{toast.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 pb-28">

          {/* BASIC INFO */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-emerald-600" />
              <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">General Settings</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Title *</label>
                  <Input
                    placeholder="e.g. Department Manager"
                    className="h-11 focus-visible:ring-emerald-500 border-slate-200 bg-slate-50/30"
                    value={form.roleName}
                    onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Code *</label>
                  <Input
                    placeholder="e.g. ROLE_01"
                    className="h-11 focus-visible:ring-emerald-500 border-slate-200 uppercase font-mono"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Availability</label>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                    <span className={`text-[10px] font-black ${form.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                      {form.isActive ? "ACTIVE" : "DISABLED"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <Textarea
                  placeholder="Summarize the access level and responsibilities..."
                  className="min-h-[100px] focus-visible:ring-emerald-500 border-slate-200 resize-none bg-slate-50/30"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* PERMISSIONS MATRIX */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Permission Matrix</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* STICKY HEADER */}
                <div className="grid grid-cols-8 bg-slate-100/80 backdrop-blur-sm p-4 text-[10px] font-bold text-slate-600 border-b border-slate-200 text-center uppercase tracking-wider sticky top-0 z-10">
                  <span className="text-left pl-2 col-span-1">Parent</span>
                  <span className="text-left pl-4 col-span-1">Module</span>
                  {permissionTypes.map((perm) => (
                    <div key={perm} className="flex items-center justify-center gap-2">
                      <span>{perm}</span>
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-blue-600 cursor-pointer"
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const updated = { ...permissions };
                          menus.forEach((m: any) => {
                            updated[m.id] = { ...updated[m.id], [perm]: checked };
                            (m.subMenus || []).forEach((sm: any) => {
                              updated[sm.id] = { ...updated[sm.id], [perm]: checked };
                            });
                          });
                          setPermissions(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50">
                  {groupedMenus.map((parent: any) => (
                    <Fragment key={parent.id}>
                      {/* Parent Row */}
                      <div className="grid grid-cols-8 items-center p-4 bg-white hover:bg-slate-50/50 transition-colors">
                        <span className="text-left font-bold text-slate-800 text-[13px] flex items-center gap-2">
                          <div className="w-1 h-4 bg-emerald-500 rounded-full" /> {parent.title}
                        </span>
                        <span className="text-slate-200">-</span>
                        {permissionTypes.map((perm) => (
                          <div key={perm} className="flex justify-center">
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-emerald-600 cursor-pointer rounded-md"
                              checked={permissions?.[parent.id]?.[perm] || false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updated = { ...permissions };
                                updated[parent.id] = { ...updated[parent.id], [perm]: checked };
                                parent.children.forEach((child: any) => {
                                  updated[child.id] = { ...updated[child.id], [perm]: checked };
                                });
                                setPermissions(updated);
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Submenu Rows */}
                      {parent.children.map((child: any) => (
                        <div key={child.id} className="grid grid-cols-8 items-center p-3 text-center hover:bg-blue-50/20 group border-b border-slate-50">
                          <span></span>
                          <span className="text-left pl-10 text-[12px] text-slate-500 font-medium group-hover:text-blue-600 transition-colors">
                            {child.title}
                          </span>
                          {permissionTypes.map((perm) => (
                            <div key={perm} className="flex justify-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-blue-600 cursor-pointer"
                                checked={permissions?.[child.id]?.[perm] || false}
                                onChange={(e) => handlePermission(child.id, perm, e.target.checked)}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FLOATING ACTION BAR */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[1400px] bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-2xl flex justify-between items-center z-50">
          <div className="flex items-center gap-3 pl-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {isEdit ? "Modifying existing role" : "Creating new role entry"}
              Unsaved changes detected in configuration
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/role")}
              className="text-slate-500 hover:bg-slate-100 px-8 font-medium"
            >
              Discard
            </Button>

            {/* Yahan humne permission check add kiya hai */}
            {hasAccess && (
              <Button
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 rounded-xl font-bold shadow-lg transition-all active:scale-95"
              >
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? "Update Changes" : "Save Role"}
              </Button>
            )}
          </div>
        </div>
        </div>

      </div>
    
  );
}