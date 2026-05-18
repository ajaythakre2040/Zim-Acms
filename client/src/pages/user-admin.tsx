import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

type PaginatedResponse<T> = {
  data: T[];
  totalPages: number;
  totalCount: number;
};

const fallbackColors: Record<string, string> = {
  super_admin: "destructive",
  admin: "default",
  employee: "outline",
};

export default function UserAdminPage() {
  const { canAdd, canEdit, canDelete, canExport, canView } = usePermission(
    MENU_CONFIG.USER_ADMIN.code,
  );
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [formData, setFormData] = useState({
    employeeCode: "",
    employeeName: "",
    username: "",
    password: "",
    email: "",
    roleId: "",
    isActive: true,
  });

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  // const { data: profiles = [], isLoading } = useQuery<any[]>({
  //   queryKey: ["/api/user-profiles"],
  // });

  // const { data: profilesResponse, isLoading } = useQuery<
  //   PaginatedResponse<any>
  // >({
  //   queryKey: [`/api/user-profiles?page=${page}&pageSize=${pageSize}`],
  // });

  const [pagedResponse, setPagedResponse] = useState<PaginatedResponse<any>>({
    data: [],
    totalPages: 1,
    totalCount: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const res = await fetch(
        `/api/user-profiles?page=${page}&pageSize=${pageSize}`,
      );

      const data = await res.json();

      setPagedResponse(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchUsers();
  }, [page]);
  const profiles = pagedResponse?.data || [];
  const totalPages = pagedResponse?.totalPages || 1;
  const totalCount = pagedResponse?.totalCount || 0;
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (editing && dialogOpen) {
      setFormData({
        employeeCode: editing.employeeCode || "",
        employeeName: editing.fullName || editing.employeeName || "",
        username: editing.username || "",
        password: "",
        email: editing.email || "",
        roleId: editing.roleId?.toString() || "",
        isActive: editing.isActive ?? true,
      });
    } else if (!dialogOpen) {
      setFormData({
        employeeCode: "",
        employeeName: "",
        username: "",
        password: "",
        email: "",
        roleId: "",
        isActive: true,
      });
    }
  }, [editing, dialogOpen]);

  const handleSearch = async () => {
    if (!formData.employeeCode) return;
    setIsSearching(true);
    try {
      const res = await apiRequest(
        "GET",
        `/api/peoplebycode/${formData.employeeCode}`,
      );
      const data = await res.json();
      if (data) {
        setFormData((prev) => ({
          ...prev,
          employeeName: data.fullName || data.employeeName || "",
          email: data.email || "",
        }));
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Not found",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: async (data: any) => {
      const url = editing
        ? `/api/user-profiles/${editing.id}`
        : "/api/user-profiles";
      const method = editing ? "PUT" : "POST";
      const payload = { ...data, roleId: parseInt(data.roleId) };
      if (editing) delete payload.password;
      await apiRequest(method, url, payload);
    },
    onSuccess: async () => {
      await fetchUsers();

      setDialogOpen(false);
      setEditing(null);

      toast({
        title: editing
          ? "User updated successfully"
          : "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/user-profiles/${id}`);
    },
    onSuccess: async () => {
      await fetchUsers();

      toast({
        title: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete user: ${name}?`)) {
      setDeletingId(id);

      try {
        await deleteMut.mutateAsync(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const columns = [
    {
      key: "employeeName",
      label: "Employee",
      render: (p: any) => (
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              {(p.fullName || p.employeeName || "U")[0]}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium">
              {p.fullName || p.employeeName}
            </p>
            <p className="text-xs text-muted-foreground">{p.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (p: any) => (
        <Badge
          variant={
            (fallbackColors[p.roleCode?.toLowerCase()] as any) || "secondary"
          }
        >
          {p.roleName || "No Role"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (p: any) => (
        <Badge variant={p.isActive ? "default" : "secondary"}>
          {p.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (p: any) => (
        <div className="flex gap-1">
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditing(p);
                setDialogOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              disabled={deletingId === p.id}
              onClick={() => handleDelete(p.id, p.fullName || p.employeeName)}
            >
              {deletingId === p.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-left">
      <PageHeader
        title="User Administration"
        action={
          canAdd && (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add User
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={profiles}
        isLoading={isLoading}
        searchable
        searchKeys={["fullName", "employeeCode", "username"]}
      />
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {(page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, totalCount)}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalCount}</span>{" "}
          users
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>

          <div className="px-3 py-1 border rounded text-sm font-medium">
            {page} / {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit User Profile" : "Create New User"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Employee Code</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.employeeCode}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeCode: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSearch}
                  disabled={isSearching || !!editing}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Employee Name</Label>
              <Input
                value={formData.employeeName}
                onChange={(e) =>
                  setFormData({ ...formData, employeeName: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div
              className={`grid ${editing ? "grid-cols-1" : "grid-cols-2"} gap-4`}
            >
              <div className="grid gap-2 text-left">
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>

              {!editing && (
                <div className="grid gap-2 text-left">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="grid gap-2 text-left">
                <Label>Assigned Role *</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, roleId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Account Status</Label>
                <div className="flex items-center justify-between border h-10 px-3 rounded-md bg-muted/20">
                  <span className="text-sm">Active</span>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(val) =>
                      setFormData({ ...formData, isActive: val })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => saveMut.mutate(formData)}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending
                ? "Processing..."
                : editing
                  ? "Update User"
                  : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
