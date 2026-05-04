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
} from "lucide-react";

import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CrudDialog } from "@/components/crud-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function MenuPage() {
  const { data, isLoading, create, update, remove } = useCrud(
    "/api/menus",
    "Menu",
  );

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  // ✅ ICON MAP
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

  // ✅ PARENT API
  const { data: parentMenus = [] } = useQuery({
    queryKey: ["menu-parents"],
    queryFn: async () => {
      const res = await fetch("/api/menus/parents");
      return res.json();
    },
  });

  const parentOptions = [
    { label: "None", value: "0" },
    ...parentMenus.map((p: any) => ({
      label: p.title,
      value: String(p.id), // 👈 important
    })),
  ];

  const columns = [
    { key: "title", label: "Title" },
    { key: "code", label: "Menu Code" },

    {
      key: "icon",
      label: "Icon",
      render: (item: any) => {
        const Icon = iconMap[item.icon];
        return Icon ? <Icon className="w-4 h-4" /> : item.icon;
      },
    },

    {
      key: "parentId",
      label: "Parent",
      render: (item: any) => {
        const parent = parentMenus.find((p: any) => p.id === item.parentId);
        return parent ? parent.title : "None";
      },
    },

    { key: "sortOrder", label: "Sort Order" },

    {
      key: "isActive",
      label: "Status",
      render: (item: any) => (
        <span className={item.isActive ? "text-green-600" : "text-red-600"}>
          {item.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },

    {
      key: "actions",
      label: "Actions",
      render: (item: any) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setEdit(item);
              setOpen(true);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button size="icon" variant="ghost" onClick={() => remove(item.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-end mb-3">
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Menu
        </Button>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} />

      <CrudDialog
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Edit Menu" : "Add Menu"}
        iconMap={iconMap} // 👈 important
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "code", label: "Menu Code", required: true },

          {
            key: "icon",
            label: "Icon",
            type: "select",
            options: iconOptions.map((i) => ({
              label: i,
              value: i,
            })),
          },

          {
            key: "parentId",
            label: "Parent Menu",
            type: "select",
            options: parentOptions,
          },

          { key: "sortOrder", label: "Sort Order", type: "number" },
          { key: "isActive", label: "Is Active", type: "switch" },
        ]}
        initialData={
          edit || {
            parentId: 0,
            sortOrder: 0,
            isActive: true,
          }
        }
        onSubmit={(data) =>
          edit ? update({ id: edit.id, data }) : create(data)
        }
      />
    </div>
  );
}
