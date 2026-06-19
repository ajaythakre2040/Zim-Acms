import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/hooks/use-confirm";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Search, Loader2, ChevronsRight, ChevronRight, ChevronLeft, ChevronsLeft, EyeOff, Eye, Key,Lock,Unlock } from "lucide-react";
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
  // ✅ Hook ko component ke andar initialize kiya hai
  const confirm = useConfirm();

  const { canAdd, canEdit, canDelete, canView } = usePermission(
    MENU_CONFIG.USER_ADMIN.code,
  );

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
    // isActive: true,
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editing && dialogOpen) {
      setFormData({
        employeeCode: editing.employeeCode || "",
        employeeName: editing.fullName || editing.employeeName || "",
        username: editing.username || "",
        password: "",
        email: editing.email || "",
        roleId: editing.roleId?.toString() || "",
        // isActive: editing.isActive ?? true,  
      });
    } else if (!dialogOpen) {
      setFormData({
        employeeCode: "",
        employeeName: "",
        username: "",
        password: "",
        email: "",
        roleId: "",
        // isActive: true,
      });
    }
  }, [editing, dialogOpen]);

  const handleSearch = async () => {
    if (!formData.employeeCode) return;
    setIsSearching(true);
    setFormData((prev) => ({
      ...prev,
      employeeName: "",
      username: "",
      password: "",
      email: "",
      roleId: "",
      // isActive: true,
    }));
    try {
      const res = await apiRequest("GET", `/api/peoplebycode/${formData.employeeCode}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setFormData((prev) => ({
        ...prev,
        employeeName: data.fullName || data.employeeName || "",
        email: data.email || "",
      }));
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Employee not found.",
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

      const payload: any = {
        ...data,
        roleId: parseInt(data.roleId)
      };

      if (editing) {
        delete payload.password;
      } else {
        if (!payload.password || payload.password.trim() === "") {
          throw new Error("Password is required for a new user.");
        }
      }

      const res = await apiRequest(method, url, payload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to process database request.");
      }
    },
    onSuccess: async () => {
      await fetchUsers();
      setDialogOpen(false);
      setEditing(null);
      toast({
        title: editing ? "User updated successfully" : "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Something went wrong while saving.",
        variant: "destructive",
      });
    },
  });

  const passwordMut = useMutation({
    mutationFn: async ({ userId, pass }: { userId: string; pass: string }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/change-password`, {
        newPassword: pass,
        confirmPassword: confirmPassword
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Password reset failed on server.");
      }
    },
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setPasswordTargetUser(null);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Success",
        description: "User password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Could not update the password.",
        variant: "destructive",
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
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

  // ✅ Custom dynamic dialog box system perfectly implemented here
  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Delete User Profile?",
      description: `Are you sure you want to permanently delete user "${name}"? This action cannot be undone.`,
      confirmText: "Yes, Delete User",
      cancelText: "Cancel",
      variant: "destructive"
    });

    if (confirmed) {
      setDeletingId(id);
      try {
        await deleteMut.mutateAsync(id);
      } catch (error) {
        console.error(error);
      } finally {
        setDeletingId(null);
      }
    }
  };
  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/toggle-status`, {
        method: "PATCH"
      });

      if (res.ok) {
        // Table data refresh karne ke liye (Aapka existing fetch function)
        fetchUsers();
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };
  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

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
        <Badge
          variant={p.isAccountActive ? "default" : "destructive"}
          className={!p.isAccountActive ? "bg-red-500 text-white" : ""}
        >
          {p.isAccountActive ? "Active" : "Blocked"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (p: any) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={p.isAccountActive ? "text-amber-600" : "text-emerald-600"}
                  onClick={() => handleToggleStatus(p.id)}
                >
                  {p.isAccountActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {/* Yeh dynamic text user ke liye clarity badha dega */}
                <p>{p.isAccountActive ? "Block User" : "Unblock User"}</p>
              </TooltipContent>
            </Tooltip>
                        {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setPasswordTargetUser(p);
                      setPasswordDialogOpen(true);
                    }}
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Change Password</p>
                </TooltipContent>
              </Tooltip>
            )}

            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit User</p>
                </TooltipContent>
              </Tooltip>
            )}

            {canDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete User</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
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
        <div className="text-sm text-muted-foreground order-2 md:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {(page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
             {Math.min(page * pageSize, pagedResponse?.totalCount || 0)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {pagedResponse?.totalCount || 0}
          </span>{" "}
          designations
        </div>

        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Go to Page
            </span>
            <input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={page}
              className="w-12 h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = Number(e.currentTarget.value);
                  if (val >= 1 && val <= totalPages) {
                    setPage(val);
                  }
                }
              }}
            />
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>

            <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
              {page} / {totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
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
                  disabled={!!editing}
                  onChange={(e) => {
                    setFormData({
                      employeeCode: e.target.value,
                      employeeName: "",
                      username: "",
                      password: "",
                      email: "",
                      roleId: "",
                      // isActive: true,
                    });
                  }}
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

            <div className={`grid ${editing ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
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
                  <div className="relative w-full">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      className="pr-10"
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
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
              {/* <div className="flex flex-col gap-2">
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
              </div> */}
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

      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        setPasswordDialogOpen(open);
        if (!open) {
          setNewPassword("");
          setConfirmPassword("");
          setPasswordTargetUser(null);
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-3 text-left">
            <div className="bg-muted/40 p-3 rounded-md border text-sm">
              <p><strong>Employee:</strong> {passwordTargetUser?.fullName || passwordTargetUser?.employeeName || "N/A"}</p>
            </div>

            <div className="grid gap-2 relative">
              <Label htmlFor="new-password">New Password *</Label>
              <div className="relative w-full">
                <Input
                  id="new-password"
                  type={showResetPassword ? "text" : "password"}
                  value={newPassword}
                  className="pr-10"
                  placeholder="Minimum 8 characters"
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2 relative">
              <Label htmlFor="confirm-password">Confirm Password *</Label>
              <div className="relative w-full">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  className="pr-10"
                  placeholder="Re-enter new password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive font-medium mt-0.5">
                  Passwords do not match!
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              disabled={
                passwordMut.isPending ||
                newPassword.trim().length < 8 ||
                newPassword !== confirmPassword
              }
              onClick={() => {
                const targetId = passwordTargetUser?.userId || passwordTargetUser?.id;
                passwordMut.mutate({ userId: targetId, pass: newPassword });
              }}
            >
              {passwordMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}