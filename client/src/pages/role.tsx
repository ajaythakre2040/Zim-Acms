import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  ArrowDownToLine,
  Download,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { useConfirm } from "@/hooks/use-confirm";
import { exportRolePermissionMatrixCSV } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

export default function RolesPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.ROLE.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const { data, isLoading, remove } = useCrud("/api/roles", "Role");
  const [, navigate] = useLocation();
  const confirm = useConfirm();
  const columns = [
    {
      key: "roleName",
      label: "Role Name",
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-md">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
          </div>
          <span className="font-bold text-slate-700">{item.roleName}</span>
        </div>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (item: any) => (
        <code className="text-[11px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
          {item.code}
        </code>
      ),
    },
    { key: "description", label: "Description" },
    {
      key: "isActive",
      label: "Status",
      render: (item: any) => (
        <div
          className={`flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full border ${
            item.isActive
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {item.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: any) => {
        const isSuperAdmin =
          item.roleName?.toLowerCase() === "super admin" &&
          item.code?.toLowerCase() === "admin_01";

        return (
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                    onClick={() =>
                      navigate(`/master-data/roles/view/${item.id}`)
                    }
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">View Permissions</TooltipContent>
              </Tooltip>

              {canEdit && !isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                      onClick={() =>
                        navigate(`/master-data/roles/edit/${item.id}`)
                      }
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit Role</TooltipContent>
                </Tooltip>
              )}

              {canDelete && !isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={async (e) => {
                        e.stopPropagation();

                        const confirmed = await confirm({
                          title: "Delete Role?",
                          description: `Are you sure you want to delete role "${item.roleName}"? This action cannot be undone.`,
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
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete Role</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
  <TooltipTrigger asChild>
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-green-600 hover:bg-green-50"
      onClick={async () => {
        try {
          const res = await fetch(
            `/api/roles-with-permissions/${item.id}`
          );

          if (!res.ok) {
            console.error("API Error:", res.status);
            return;
          }

          const data = await res.json();

          if (!data?.permissions?.length) {
            console.error("No permissions found", data);
            return;
          }

          exportRolePermissionMatrixCSV(
            `Role_${item.roleName}_Permissions`,
            data
          );
        } catch (err) {
          console.error("Export failed:", err);
        }
      }}
    >
      <ArrowDownToLine className="w-4 h-4" />
    </Button>
  </TooltipTrigger>

  <TooltipContent side="top">Export Role</TooltipContent>
</Tooltip>
            </div>
          </TooltipProvider>
        );
      },
    },
  ];

  return (
    <div className="p-8 space-y-6 bg-slate-50/30 min-h-screen font-sans">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Roles Management
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Define and control user access levels across the system.
          </p>
        </div>
        {canAdd && (
          <Button
            onClick={() => navigate("/master-data/roles/add")}
            // className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 gap-2 px-5 rounded-xl font-bold transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add New Role
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}
