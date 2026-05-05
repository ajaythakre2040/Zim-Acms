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

// Colors fallback ke liye, agar API se color na aaye toh
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
  const [errors, setErrors] = useState({ username: "", password: "" });

  // Form State
  const [formData, setFormData] = useState({
    employeeCode: "",
    employeeName: "",
    username: "",
    password: "",
    email: "",
    role: "", // Initial empty, roles fetch hone par set hoga
    isActive: true,
  });

  // 1. Roles fetch karna API se
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  // Profiles data
  const { data: profiles = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/user-profiles"],
  });

  useEffect(() => {
    if (editing) {
      const editData = editing as any;
      setFormData({
        employeeCode: editData.employeeCode || "",
        employeeName: editData.employeeName || "",
        username: editData.username || "",
        password: "",
        email: editData.email || "",
        role: editData.role || editData.roleName || "",
        isActive: editData.isActive ?? true,
      });
    } else {
      setFormData({
        employeeCode: "",
        employeeName: "",
        username: "",
        password: "",
        email: "",
        // Ise empty string rakhein taaki placeholder "Select Role" dikhe
        role: "",
        isActive: true,
      });
    }
  }, [editing, dialogOpen]); // roles dependency ki ab zaroorat nahi agar default nahi chahiye

  const handleSearch = async () => {
    if (!formData.employeeCode) {
      toast({
        title: "Error",
        description: "Please enter an employee code first.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const res = await apiRequest(
        "GET",
        `/api/peoplebycode/${formData.employeeCode}`,
      );

      const data = await res.json();

      // Check karein ki data khali toh nahi (e.g. empty array ya object)
      if (data && (data.employeeName || data.fullName)) {
        setFormData((prev) => ({
          ...prev,
          // Aapke JSON mein 'employeeName' hai, toh wahi prioritize karenge
          employeeName: data.employeeName || data.fullName || "",
          email: data.email || "",
          // Email null ho sakta hai, toh uske liye fallback logic
          // username:
          //   data.username ||
          //   (data.email
          //     ? data.email.split("@")[0]
          //     : data.employeeName?.toLowerCase().replace(/\s+/g, "") || ""),
        }));

        toast({
          title: "Success",
          description: `Details for ${data.employeeName || "Employee"} fetched.`,
        });
      } else {
        // Agar API 200 de par data na ho
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Employee found but details are missing.",
        });
      }
    } catch (err) {
      console.error("Search Error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch employee details.",
      });
    } finally {
      setIsSearching(false);
    }
  };
  const saveMut = useMutation({
    mutationFn: async (data: any) => {
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `/api/user-profiles/${(editing as any).id}`
        : "/api/user-profiles";
      await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] });
      setDialogOpen(false);
      toast({ title: "Success" });
    },
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
      render: (p: any) => {
        const roleObj = roles.find((r: any) => r.roleName === p.role);
        return (
          <Badge variant={(fallbackColors[p.role] as any) || "secondary"}>
            {roleObj ? roleObj.roleName : p.role}
          </Badge>
        );
      },
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
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={() => confirm("Are you sure you want to delete this user?")}
          >
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
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={profiles}
        isLoading={isLoading}
        searchable
        searchKeys={["employeeName", "employeeCode"]}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setErrors({ username: "", password: "" }); // Reset errors on close
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Employee Code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="EMP001"
                  value={formData.employeeCode}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeCode: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSearch}
                  disabled={isSearching}
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
              <Label>Name</Label>
              <Input
                value={formData.employeeName}
                onChange={(e) =>
                  setFormData({ ...formData, employeeName: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Username Field */}
              <div className="grid gap-2 text-left">
                <Label>
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  className={errors.username ? "border-destructive" : ""}
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    if (e.target.value)
                      setErrors((prev) => ({ ...prev, username: "" }));
                  }}
                />
                <div className="min-h-[18px]">
                  {errors.username && (
                    <p className="text-[12px] text-destructive">
                      {errors.username}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div className="grid gap-2 text-left">
                <Label>
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  className={errors.password ? "border-destructive" : ""}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (e.target.value)
                      setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                />
                <div className="min-h-[18px]">
                  {errors.password && (
                    <p className="text-[12px] text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="grid gap-2 text-left">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) =>
                    setFormData({ ...formData, role: val })
                  }
                >
                  <SelectTrigger>
                    {/* Agar value "" hai, toh ye niche wala placeholder dikhayega */}
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.id} value={r.roleName}>
                        {r.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border h-10 px-3 rounded-md">
                <span className="text-sm font-medium">Active</span>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(val) =>
                    setFormData({ ...formData, isActive: val })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                const newErrors = { username: "", password: "" };
                let hasError = false;

                if (!formData.username.trim()) {
                  newErrors.username = "Username is required!";
                  hasError = true;
                }
                if (!formData.password.trim()) {
                  newErrors.password = "Password is required!";
                  hasError = true;
                }

                if (hasError) {
                  setErrors(newErrors);
                  toast({
                    title: "Required Fields",
                    description:
                      !formData.username && !formData.password
                        ? "Username and Password are required!"
                        : newErrors.username || newErrors.password,
                    variant: "destructive",
                  });
                  return;
                }

                saveMut.mutate(formData);
              }}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
