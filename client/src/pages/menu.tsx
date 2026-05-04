import {
  LayoutDashboard, Users, UserCheck, Clock, DoorOpen, Cpu, Building2,
  Shield, Key, CalendarDays, Calendar, Bell, FileWarning, Settings,
  UserCog, MapPin, Layers, CreditCard, BookOpen, LogOut, ChevronRight,
  Zap, FileText, Timer, Siren, ChevronDown, Activity, Plus, Pencil, Trash2, FolderTree
} from "lucide-react";

import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { CrudDialog } from "@/components/crud-dialog";
import { Badge } from "@/components/ui/badge";

export default function MenuPage() {
  const { data = [], isLoading, create, update, remove } = useCrud("/api/menus", "Menu");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const iconMap: any = {
    LayoutDashboard, Users, UserCheck, Clock, DoorOpen, Cpu, Building2,
    Shield, Key, CalendarDays, Calendar, Bell, FileWarning, Settings,
    UserCog, MapPin, Layers, CreditCard, BookOpen, LogOut, ChevronRight,
    Zap, FileText, Timer, Siren, ChevronDown, Activity,
  };

  const iconOptions = Object.keys(iconMap);

  // ✅ 1. Flatten Data: Parent aur Sub-menus ko ek list mein laane ke liye
  const flattenedData = useMemo(() => {
    const result: any[] = [];
    data.forEach((parent: any) => {
      result.push({ ...parent, isSubMenu: false });
      if (parent.subMenus && parent.subMenus.length > 0) {
        parent.subMenus.forEach((child: any) => {
          result.push({ ...child, isSubMenu: true });
        });
      }
    });
    return result;
  }, [data]);

  // ✅ 2. Dialog Parent Options
  const parentOptions = [
    { label: "Root (No Parent)", value: "0" },
    ...data
      .filter((m: any) => m.parentId === 0 || !m.parentId)
      .map((p: any) => ({
        label: p.title,
        value: String(p.id),
      })),
  ];

  const columns = [
    {
      key: "title",
      label: "Menu Title",
      render: (item: any) => (
        <div className={`flex items-center gap-3 ${item.isSubMenu ? "ml-10" : ""}`}>
          <div className={`p-2 rounded-lg border ${item.isSubMenu ? "bg-slate-50 border-slate-100" : "bg-blue-50 border-blue-100"
            }`}>
            {item.isSubMenu ? (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            ) : (
              (() => {
                const Icon = iconMap[item.icon] || FolderTree;
                return <Icon className="w-4 h-4 text-blue-600" />;
              })()
            )}
          </div>
          <div>
            <p className={`leading-none ${item.isSubMenu ? "text-slate-500 text-sm font-medium" : "font-bold text-slate-800"}`}>
              {item.title}
            </p>
          </div>
        </div>
      )
    },
    {
      key: "menuCode",
      label: "Code",
      render: (item: any) => (
        <code className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">
          {item.menuCode}
        </code>
      )
    },
    {
      key: "parentId",
      label: "Hierarchy",
      render: (item: any) => (
        <Badge variant="outline" className={`font-medium ${item.isSubMenu ? "text-slate-400 border-slate-200" : "text-blue-600 border-blue-200 bg-blue-50/50"}`}>
          {item.isSubMenu ? "Child" : "Parent"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (item: any) => (
        <div className={`flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest ${item.isActive ? "text-emerald-600" : "text-rose-400"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-rose-400"}`} />
          {item.isActive ? "Active" : "Hidden"}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: any) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => { setEdit(item); setOpen(true); }}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => { if (confirm(`Delete ${item.title}?`)) remove(item.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50/30 h-screen flex flex-col font-sans overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Menus Management</h1>
          <p className="text-sm text-slate-500 font-medium">Configure system hierarchy and navigation.</p>
        </div>
        <Button
          onClick={() => { setEdit(null); setOpen(true); }}
          className="bg-slate-900 hover:bg-slate-800 text-white gap-2 px-6 rounded-xl font-bold transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add Menu Item
        </Button>
      </div>

      {/* ✅ SCROLLABLE TABLE AREA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <DataTable
            columns={columns}
            data={flattenedData}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Custom Styles for thinner scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      <CrudDialog
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Edit Menu Entry" : "New Menu Entry"}
        iconMap={iconMap}
        fields={[
          { key: "title", label: "Display Title", required: true },
          { key: "menuCode", label: "System Code", required: true },
          { key: "icon", label: "Menu Icon", type: "select", options: iconOptions.map((i) => ({ label: i, value: i })) },
          { key: "parentId", label: "Parent Menu", type: "select", options: parentOptions },
          { key: "sortOrder", label: "Sort Position", type: "number" },
          { key: "isActive", label: "Visible in Sidebar", type: "switch" },
        ]}
        initialData={edit || { parentId: "0", sortOrder: 0, isActive: true }}
        onSubmit={(formData) => {
          const payload = { ...formData, parentId: parseInt(formData.parentId) };
          edit ? update({ id: edit.id, data: payload }) : create(payload);
        }}
      />
    </div>
  );
}