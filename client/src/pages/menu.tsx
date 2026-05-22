import {
  LayoutDashboard,
  Users,
  UserCheck,
  Clock,
  DoorOpen,
  Cpu,
  Building2,
  Shield,
  Key,
  CalendarDays,
  Calendar,
  Bell,
  FileWarning,
  Settings,
  UserCog,
  MapPin,
  Layers,
  CreditCard,
  BookOpen,
  LogOut,
  ChevronRight,
  Zap,
  FileText,
  Timer,
  Siren,
  ChevronDown,
  Activity,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
} from "lucide-react";

import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { CrudDialog } from "@/components/crud-dialog";
import { Badge } from "@/components/ui/badge";
import { validateNoHtml } from "@/lib/validation";
import { MENU_CONFIG } from "../../../server/constant";
import { usePermission } from "@/hooks/use-permission";
import { useConfirm } from "@/hooks/use-confirm";
export default function MenuPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.MENU_MASTER.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  // 1. Hook se setErrors nikalna zaroori hai
  const {
    data = [],
    isLoading,
    create,
    update,
    remove,
    errors: serverErrors,
    setErrors,
  } = useCrud("/api/menus", "Menu");
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const iconMap: any = {
    LayoutDashboard,
    Users,
    UserCheck,
    Clock,
    DoorOpen,
    Cpu,
    Building2,
    Shield,
    Key,
    CalendarDays,
    Calendar,
    Bell,
    FileWarning,
    Settings,
    UserCog,
    MapPin,
    Layers,
    CreditCard,
    BookOpen,
    LogOut,
    ChevronRight,
    Zap,
    FileText,
    Timer,
    Siren,
    ChevronDown,
    Activity,
  };

  const iconOptions = Object.keys(iconMap);

  // Modal close karne ka common function taaki errors reset ho jayein
  const handleClose = () => {
    setOpen(false);
    setLocalErrors({});
    setErrors({}); // useCrud ki internal error state clear karta hai
  };

  const flattenedData = useMemo(() => {
    const result: any[] = [];
    data.forEach((parent: any) => {
      result.push({ ...parent, isSubMenu: false });
      if (parent.subMenus && parent.subMenus.length > 0) {
        const sortedChildren = [...parent.subMenus].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );
        sortedChildren.forEach((child: any) => {
          result.push({ ...child, isSubMenu: true });
        });
      }
    });
    return result;
  }, [data]);

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
      render: (item: any) => {
        const IconComponent = iconMap[item.icon] || FolderTree;
        return (
          <div
            className={`flex items-center gap-3 ${item.isSubMenu ? "ml-10" : ""}`}
          >
            <div
              className={`p-2 rounded-lg border transition-all ${
                item.isSubMenu
                  ? "bg-slate-50 border-slate-100 scale-90"
                  : "bg-blue-50 border-blue-100 shadow-sm"
              }`}
            >
              <IconComponent
                className={`w-4 h-4 ${item.isSubMenu ? "text-slate-400" : "text-blue-600"}`}
              />
            </div>
            <div className="flex items-center gap-2">
              {item.isSubMenu && (
                <ChevronRight className="w-3 h-3 text-slate-300" />
              )}
              <p
                className={`leading-none ${item.isSubMenu ? "text-slate-500 text-sm font-medium" : "font-bold text-slate-800"}`}
              >
                {item.title}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "code",
      label: "Code",
      render: (item: any) => (
        <code className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded text-slate-400 uppercase border border-slate-100">
          {item.code}
        </code>
      ),
    },
    {
      key: "parentId",
      label: "Hierarchy",
      render: (item: any) => (
        <Badge
          variant="outline"
          className={`font-medium ${item.isSubMenu ? "text-slate-400 border-slate-200" : "text-blue-600 border-blue-200 bg-blue-50/50"}`}
        >
          {item.isSubMenu ? "Sub-menu" : "Main Module"}
        </Badge>
      ),
    },
    {
      key: "sortOrder",
      label: "Order",
      render: (item: any) => (
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-bold border border-slate-200">
          {item.sortOrder}
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (item: any) => (
        <div
          className={`flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest ${item.isActive ? "text-emerald-600" : "text-rose-400"}`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-rose-400"}`}
          />
          {item.isActive ? "Active" : "Hidden"}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: any) => (
        <div className="flex gap-1">
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => {
                setEdit(item);
                setErrors({}); // Edit khulne par purane errors clear
                setOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              onClick={async () => {
                const confirmed = await confirm({
                  title: "Delete Menu Item?",
                  description: `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
                  confirmText: "Yes, Delete",
                  cancelText: "Cancel",
                  variant: "destructive",
                });

                if (!confirmed) return;

                try {
                  await remove(item.id);
                } catch (err: any) {
                  console.error(err);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ].filter((col) => {
    if (col.key === "actions") {
      return canEdit || canDelete;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50/30 h-screen flex flex-col font-sans overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Menu Management
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Configure hierarchy and visibility for navigation modules.
          </p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEdit(null);
              setLocalErrors({});
              setErrors({}); // Naya form khulne par errors clear
              setOpen(true);
            }}
            // className="bg-slate-900 hover:bg-slate-800 text-white gap-2 px-6 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Menu Item
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <DataTable
            columns={columns}
            data={flattenedData}
            isLoading={isLoading}
          />
        </div>
      </div>

      <CrudDialog
        open={open}
        onClose={handleClose}
        title={edit ? "Edit Menu Entry" : "New Menu Entry"}
        iconMap={iconMap}
        errors={{ ...serverErrors, ...localErrors }}
        fields={[
          { key: "title", label: "Display Title", required: true },
          { key: "code", label: "System Code", required: true },
          {
            key: "icon",
            label: "Menu Icon",
            type: "select",
            options: iconOptions.map((i) => ({ label: i, value: i })),
          },
          {
            key: "parentId",
            label: "Parent Menu",
            type: "select",
            options: parentOptions,
          },
          { key: "sortOrder", label: "Sort Position", type: "number" },
          { key: "isActive", label: "Visible in Sidebar", type: "switch" },
        ]}
        initialData={edit || { parentId: "0", sortOrder: 0, isActive: true }}
        onSubmit={async (formData) => {
          setLocalErrors({});

          // 🛡️ XSS Validation (ADD + EDIT)
          const validationErrors = validateNoHtml(formData);
          if (Object.keys(validationErrors).length > 0) {
            setLocalErrors(validationErrors);
            return;
          }

          const payload = {
            ...formData,
            parentId: parseInt(formData.parentId),
          };

          try {
            if (edit) {
              await update({ id: edit.id, data: payload });
            } else {
              await create(payload);
            }

            handleClose(); // ✅ reset + close
          } catch (error: any) {
            const errorData = error.response?.data;
            const newErrors: Record<string, string> = {};

            if (Array.isArray(errorData)) {
              errorData.forEach((err: any) => {
                const fieldKey = err.path && err.path[0];
                if (fieldKey) newErrors[fieldKey] = err.message;
              });
            } else if (errorData?.isDuplicate) {
              const field = errorData.message.toLowerCase().includes("code")
                ? "code"
                : "title";
              newErrors[field] = errorData.message;
            } else if (
              typeof errorData === "string" &&
              errorData.includes("HTML")
            ) {
              newErrors["code"] = "HTML tags are not allowed.";
            }

            if (Object.keys(newErrors).length > 0) {
              setLocalErrors(newErrors);
            }
          }
        }}
      />
    </div>
  );
}
