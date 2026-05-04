import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useParams } from "wouter";
import { useMemo } from "react";
export default function RoleFormPage() {

  const { id } = useParams();
  console.log("ID from URL:", id);
  const roleId = id;
  const isEdit = !!roleId;
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    roleName: "",
    roleCode: "",
    description: "",
    isActive: true,
  });

  const [permissions, setPermissions] = useState<any>({});

  const permissionTypes = ["view", "add", "edit", "delete", "print", "export"];

  // ✅ FIXED TOAST AUTO CLOSE (OUTSIDE HANDLE SUBMIT)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);

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
    const res = await fetch(`/api/roles-with-permissions/${roleId}`);
    const data = await res.json();

    console.log("RAW ARRAY:", data);

    if (!Array.isArray(data) || data.length === 0) return;

    // 🔥 ROLE INFO (take first valid row)
    const roleInfo =
      data.find((d: any) => d.roleName || d.roleCode) || data[0];

    setForm({
      roleName: roleInfo?.roleName || "",
      roleCode: roleInfo?.roleCode || "",
      description: roleInfo?.description || "",
      isActive: roleInfo?.isActive ?? true,
    });

    // 🔥 PERMISSIONS (NEVER BREAK THIS)
    const permMap: any = {};

    data.forEach((p: any) => {
      if (!p.menuId) return;

      permMap[p.menuId] = {
        view: !!p.view,
        add: !!p.add,
        edit: !!p.edit,
        delete: !!p.delete,
        print: !!p.print,
        export: !!p.export,
      };
    });

    console.log("PERMISSION MAP:", permMap);

    setPermissions(permMap);
  };

  fetchRole();
}, [roleId]);
  // MENUS API

  // GROUP MENUS
  const groupedMenus = useMemo(() => {
    return menus
      .filter((m: any) => m.parentId === 0)
      .map((parent: any) => ({
        ...parent,
        children: menus.filter((m: any) => m.parentId === parent.id),
      }));
  }, [menus]);

  // SINGLE CHECK
  const handlePermission = (menuId: number, type: string, value: boolean) => {
    setPermissions((prev: any) => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [type]: value,
      },
    }));
  };

  // SAVE
  const handleSubmit = async () => {
    try {
      // ✅ VALIDATION (ADDED)
      if (!form.roleName.trim()) {
        setToast({
          message: "Role Name is required",
          type: "error",
        });
        return;
      }

      if (!form.roleCode.trim()) {
        setToast({
          message: "Role Code is required",
          type: "error",
        });
        return;
      }

      const payload = {
        role: {
          roleName: form.roleName,
          roleCode: form.roleCode,
          description: form.description,
          isActive: form.isActive,
        },
        permissions: Object.entries(permissions).map(
          ([menuId, perms]: any) => ({
            menuId: Number(menuId),
            ...perms,
          }),
        ),
      };

      const url = isEdit
        ? `/api/roles-with-permissions/${roleId}`
        : "/api/roles-with-permissions";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({
          message: data.message || "Save failed",
          type: "error",
        });
        return;
      }

      // SUCCESS TOAST
      setToast({
        message: "Role saved successfully",
        type: "success",
      });

      setSuccessMsg("Role saved successfully");

      // RESET FORM
      setForm({
        roleName: "",
        roleCode: "",
        description: "",
        isActive: true,
      });

      setPermissions({});
    } catch (err) {
      console.error(err);

      setToast({
        message: "Something went wrong",
        type: "error",
      });
    }
  };
  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold">
          {isEdit ? "Edit Role" : "Add Role"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Dashboard • Role • {isEdit ? "Edit Role" : "Add Role"}
        </p>
      </div>

      {/* TOAST UI */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white text-sm z-50
          ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
        >
          {toast.message}
        </div>
      )}

      <div className="bg-white dark:bg-background rounded-xl shadow p-6 space-y-6">
        {/* BASIC INFO */}
        <div>
          <h2 className="text-green-600 font-semibold mb-4">
            Basic Role Information
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Role Name *"
              value={form.roleName}
              onChange={(e) => setForm({ ...form, roleName: e.target.value })}
            />

            <Input
              placeholder="Role Code *"
              value={form.roleCode}
              onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
            />

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <span className="text-sm">
                {form.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
        </div>

        {/* PERMISSIONS */}
        <div>
          <h2 className="text-green-600 font-semibold mb-4">
            Assign Role Permissions
          </h2>

          <div className="border rounded-lg overflow-hidden">
            {/* ✅ HEADER (UNCHANGED AS YOU ASKED) */}
            <div className="grid grid-cols-8 bg-muted p-2 text-sm font-medium text-center">
              <span>Parent Menu</span>
              <span>Sub Menu</span>

              {permissionTypes.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center justify-center gap-2"
                >
                  <span className="capitalize">{perm}</span>

                  <input
                    type="checkbox"
                    checked={menus.every(
                      (m: any) => permissions?.[m.id]?.[perm],
                    )}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const updated: any = { ...permissions };

                      menus.forEach((m: any) => {
                        updated[m.id] = {
                          ...updated[m.id],
                          [perm]: checked,
                        };
                      });

                      groupedMenus.forEach((parent: any) => {
                        updated[parent.id] = {
                          ...updated[parent.id],
                          [perm]: checked,
                        };
                      });

                      setPermissions(updated);
                    }}
                  />
                </div>
              ))}
            </div>

            {/* DATA */}
            {groupedMenus.map((parent: any) => (
              <div key={parent.id}>
                {/* PARENT ROW */}
                <div className="grid grid-cols-8 items-center p-2 border-t font-semibold text-center">
                  <span>{parent.title}</span>
                  <span>-</span>

                  {permissionTypes.map((perm) => (
                    <input
                      key={perm}
                      type="checkbox"
                      checked={
                        parent.children.length > 0
                          ? parent.children.every(
                              (c: any) => permissions?.[c.id]?.[perm],
                            )
                          : permissions?.[parent.id]?.[perm] || false
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const updated: any = { ...permissions };

                        if (parent.children.length > 0) {
                          parent.children.forEach((child: any) => {
                            updated[child.id] = {
                              ...updated[child.id],
                              [perm]: checked,
                            };
                          });
                        } else {
                          updated[parent.id] = {
                            ...updated[parent.id],
                            [perm]: checked,
                          };
                        }

                        setPermissions(updated);
                      }}
                    />
                  ))}
                </div>

                {/* CHILDREN */}
                {parent.children.map((child: any) => (
                  <div
                    key={child.id}
                    className="grid grid-cols-8 items-center p-2 border-t text-center"
                  >
                    <span></span>
                    <span className="pl-4">{child.title}</span>

                    {permissionTypes.map((perm) => (
                      <input
                        key={perm}
                        type="checkbox"
                        checked={permissions?.[child.id]?.[perm] || false}
                        onChange={(e) =>
                          handlePermission(child.id, perm, e.target.checked)
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/master-data/roles")}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit}>Save</Button>
        </div>
      </div>
    </div>
  );
}
