import { useEffect, useState, useMemo, Fragment } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, ShieldCheck, LayoutGrid, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function RoleFormPage() {
  const { id } = useParams();
  const roleId = id;
  const isEdit = !!roleId;
  const [, navigate] = useLocation();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({
    roleName: "",
    roleCode: "",
    description: "",
    isActive: true,
  });

  const [permissions, setPermissions] = useState<any>({});
  const permissionTypes = ["view", "add", "edit", "delete", "print", "export"];

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const { data: menus = [] } = useQuery({
    queryKey: ["menus"],
    queryFn: async () => {
      const res = await fetch("/api/menus");
      return res.json();
    },
  });

  useEffect(() => {
    if (!roleId) return;
    const fetchRole = async () => {
      try {
        const res = await fetch(`/api/roles-with-permissions/${roleId}`);
        const data = await res.json();
        setForm({
          roleName: data.roleName || "",
          roleCode: data.roleCode || "",
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

  const handleSubmit = async () => {
    try {
      if (!form.roleName.trim() || !form.roleCode.trim()) {
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
      if (!res.ok) throw new Error("Save failed");
      setToast({ message: "Role saved successfully", type: "success" });
      setTimeout(() => navigate("/master-data/roles"), 1500);
    } catch (err) {
      setToast({ message: "Something went wrong", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* HEADER SECTION */}
        <div className="flex items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/master-data/roles")}
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all mr-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </Button>
          <div className="h-6 w-[1px] bg-slate-200 mr-4" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {isEdit ? "Edit Role" : "Add New Role"}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Manage module accessibility and user privileges</p>
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className={`fixed top-8 right-8 px-6 py-3 rounded-xl shadow-2xl text-white text-sm z-50 animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">{toast.message}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 pb-28">

          {/* BASIC INFORMATION */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-green-600" />
              <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Basic Information</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Role Name *</label>
                  <Input
                    placeholder="Enter role name"
                    className="h-11 focus-visible:ring-green-500 border-slate-200"
                    value={form.roleName}
                    onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Role Code *</label>
                  <Input
                    placeholder="Enter role code"
                    className="h-11 focus-visible:ring-green-500 border-slate-200 uppercase"
                    value={form.roleCode}
                    onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
                  />
                </div>
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                    <span className={`text-[10px] font-black ${form.isActive ? "text-green-600" : "text-slate-400"}`}>
                      {form.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Description</label>
                <Textarea
                  placeholder="Describe the responsibilities..."
                  className="min-h-[100px] focus-visible:ring-green-500 border-slate-200 resize-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* PERMISSIONS TABLE (LIGHT THEME) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Access Matrix</h2>
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Toggle columns to bulk apply</p>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* UPDATED LIGHT HEADER */}
                <div className="grid grid-cols-8 bg-slate-50 p-4 text-[10px] font-bold text-slate-600 border-b border-slate-200 text-center uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <span className="text-left pl-2 col-span-1">Parent Module</span>
                  <span className="text-left pl-4 col-span-1">Sub Module</span>
                  {permissionTypes.map((perm) => (
                    <div key={perm} className="flex items-center justify-center gap-2 bg-white/50 py-1 rounded border border-slate-100">
                      <span>{perm}</span>
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-green-600 cursor-pointer rounded-sm"
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

                {/* Body Area */}
                <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                  {groupedMenus.map((parent: any) => (
                    <Fragment key={parent.id}>
                      <div className="grid grid-cols-8 items-center p-4 bg-white font-semibold text-center hover:bg-slate-50/30 transition-colors">
                        <span className="text-left font-bold text-slate-800 pl-2 text-[13px] flex items-center gap-2">
                          <div className="w-1 h-4 bg-green-500 rounded-full" /> {parent.title}
                        </span>
                        <span className="text-slate-300">-</span>
                        {permissionTypes.map((perm) => (
                          <div key={perm} className="flex justify-center">
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-green-600 cursor-pointer rounded-md transition-all active:scale-90"
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

                      {parent.children.map((child: any) => (
                        <div key={child.id} className="grid grid-cols-8 items-center p-3 text-center hover:bg-blue-50/30 transition-all border-b border-slate-50 group">
                          <span></span>
                          <span className="text-left pl-10 text-[12px] text-slate-500 font-medium group-hover:text-blue-600 transition-colors">
                            {child.title}
                          </span>
                          {permissionTypes.map((perm) => (
                            <div key={perm} className="flex justify-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-blue-600 cursor-pointer rounded shadow-sm transition-all active:scale-90"
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

        {/* BOTTOM ACTION BAR */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[1400px] bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex justify-between items-center z-50">
          <div className="flex items-center gap-2 pl-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
              Ready to sync access permissions?
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/master-data/roles")}
              className="text-slate-500 hover:bg-slate-100 px-8 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-12 rounded-xl font-bold shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              <Save className="w-4 h-4 mr-2" /> {isEdit ? "Update Changes" : "Save Configuration"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}