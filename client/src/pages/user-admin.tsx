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
import type { UserProfile } from "@shared/schema";

const fallbackColors: Record<string, string> = {
  super_admin: "destructive",
  admin: "default",
  employee: "outline",
};

export default function UserAdminPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState({ username: "", password: "", roleId: "" });

  const [formData, setFormData] = useState({
    employeeCode: "",
    employeeName: "",
    username: "",
    password: "",
    email: "",
    roleId: "", // ID string format mein Select component ke liye
    isActive: true,
  });

  // 1. Roles fetch karna (Backend returns: {id, roleName, code})
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  // 2. User Profiles fetch karna
  const { data: profiles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user-profiles"],
  });

  useEffect(() => {
    if (editing) {
      const editData = editing as any;
      setFormData({
        employeeCode: editData.employeeCode || "",
        employeeName: editData.employeeName || "",
        username: editData.username || "",
        password: "", // Edit ke waqt password blank rakhein
        email: editData.email || "",
        roleId: editData.roleId?.toString() || "",
        isActive: editData.isActive ?? true,
      });
    } else {
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
    if (!formData.employeeCode) {
      toast({ title: "Error", description: "Please enter code.", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiRequest("GET", `/api/peoplebycode/${formData.employeeCode}`);
      const data = await res.json();
      if (data && (data.employeeName || data.fullName)) {
        setFormData((prev) => ({
          ...prev,
          employeeName: data.employeeName || data.fullName || "",
          email: data.email || "",
        }));
        toast({ title: "Found", description: `${data.employeeName} details fetched.` });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Employee not found." });
    } finally {
      setIsSearching(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: async (data: any) => {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/user-profiles/${(editing as any).id}` : "/api/user-profiles";

      // Convert roleId to number for backend
      const payload = { ...data, roleId: parseInt(data.roleId) };
      await apiRequest(method, url, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] });
      setDialogOpen(false);
      toast({ title: "User saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
  });

  const columns = [
    {
      key: "employeeName",
      label: "Employee",
      render: (p: any) => (
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback>{(p.employeeName || "U")[0]}</AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium">{p.employeeName}</p>
            <p className="text-xs text-muted-foreground">{p.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (p: any) => (
        <Badge variant={(fallbackColors[p.roleCode?.toLowerCase()] as any) || "secondary"}>
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
          <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
            if (confirm("Delete this user?")) {
              // Add delete mutation here if needed
            }
          }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-left">
      <PageHeader
        title="User Administration"
        action={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={profiles}
        isLoading={isLoading}
        searchable
        searchKeys={["employeeName", "employeeCode", "username"]}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setErrors({ username: "", password: "", roleId: "" });
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User Profile" : "Create New User"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Employee Search Section */}
            <div className="grid gap-2">
              <Label>Employee Code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="EMP001"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                />
                <Button type="button" variant="secondary" onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2 text-left">
                <Label>Username <span className="text-destructive">*</span></Label>
                <Input
                  className={errors.username ? "border-destructive" : ""}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="grid gap-2 text-left">
                <Label>{editing ? "Change Password" : "Password *"}</Label>
                <Input
                  type="password"
                  placeholder={editing ? "••••••••" : "Required"}
                  className={errors.password ? "border-destructive" : ""}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="grid gap-2 text-left">
                <Label>Assigned Role <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(val) => setFormData({ ...formData, roleId: val })}
                >
                  <SelectTrigger className={errors.roleId ? "border-destructive" : ""}>
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
                    onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                const newErrors = { username: "", password: "", roleId: "" };
                let hasError = false;

                if (!formData.username.trim()) {
                  newErrors.username = "Required";
                  hasError = true;
                }
                if (!editing && !formData.password.trim()) {
                  newErrors.password = "Required";
                  hasError = true;
                }
                if (!formData.roleId) {
                  newErrors.roleId = "Required";
                  hasError = true;
                }

                if (hasError) {
                  setErrors(newErrors);
                  toast({ title: "Validation Error", description: "Please fill required fields.", variant: "destructive" });
                  return;
                }

                saveMut.mutate(formData);
              }}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? "Processing..." : editing ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}