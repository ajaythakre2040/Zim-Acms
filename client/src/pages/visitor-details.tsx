import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm"; 
import { validateNoHtml } from "@/lib/validation";
import {
  Pencil,
  Plus,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  Eye,
  Trash2,
  LogOut,
} from "lucide-react";
import { PaginationSize } from "@/components/ui/pagination";

// Shadcn UI Components
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function VisitorsPage() {
  const confirm = useConfirm(); 
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<any>(null);
  const { toast } = useToast();

  // Shifts page ki tarah errors ke liye ek specific state object banaya:
  const [errors, setErrors] = useState<Record<string, string>>({});

  // View Modal State
  const [viewingVisitor, setViewingVisitor] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Pagination & Search States for Main Grid
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [pagedResponse, setPagedResponse] = useState<any>(null);

  // Server-Side Data Fetcher for Visitors
  const fetchVisitors = async () => {
    try {
      const res = await fetch(
        `/api/visitors?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
      );
      const data = await res.json();
      setPagedResponse(data);
    } catch (err) {
      // Silent catch
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [page, pageSize, search]);

  // Dynamic Dropdowns Hooks
  const { data: designations = [] } = useQuery({
    queryKey: ["/api/designations"],
    queryFn: async () => {
      const res = await fetch("/api/designations");
      return res.json();
    },
  });

  const { data: visitorCards = [] } = useQuery({
    queryKey: ["/api/visitor_cards_dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/visitor_cards/dropdown");
      const resData = await res.json();
      return Array.isArray(resData) ? resData : resData?.data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/people");
      const resData = await res.json();
      return Array.isArray(resData) ? resData : resData?.data || [];
    },
  });

  // Data Fallback Parsers
  const visitorsData = Array.isArray(pagedResponse)
    ? pagedResponse
    : pagedResponse?.data || [];
  const totalCount = pagedResponse?.totalCount || visitorsData.length || 0;
  const totalPages =
    pagedResponse?.totalPages || Math.ceil(totalCount / pageSize) || 1;

  // Mutations
  const createVisitor = useMutation({
    mutationFn: async (d: any) => {
      const matchingCard = visitorCards.find(
        (c: any) => String(c.cardNumber).trim() === String(d.rfidCardNo).trim(),
      );

      const payload = {
        ...d,
        visitorCardId: matchingCard ? Number(matchingCard.id) : null,
      };

      const r = await apiRequest("POST", "/api/visitors", payload);
      return r.json();
    },
    onSuccess: () => {
      fetchVisitors();
      setVisitorDialog(false);
      setErrors({}); // Success par errors clear kiye
      toast({ title: "Visitor registered successfully" });
    },
    onError: (e: Error) =>
      toast({
        title: "Registration Error",
        description: e.message,
        variant: "destructive",
      }),
  });

  const updateVisitor = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const matchingCard = visitorCards.find(
        (c: any) =>
          String(c.cardNumber).trim() === String(data.rfidCardNo).trim(),
      );

      const payload = {
        ...data,
        visitorCardId: matchingCard ? Number(matchingCard.id) : null,
      };

      const r = await apiRequest("PUT", `/api/visitors/${id}`, payload);
      return r.json();
    },
    onSuccess: () => {
      fetchVisitors();
      setVisitorDialog(false);
      setEditingVisitor(null);
      setErrors({}); // Success par errors clear kiye
      toast({ title: "Visitor profile updated" });
    },
    onError: (e: Error) =>
      toast({
        title: "Update Error",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteVisitor = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest("DELETE", `/api/visitors/${id}`);
      return r.json();
    },
    onSuccess: () => {
      fetchVisitors();
      toast({ title: "Visitor deleted successfully" });
    },
    onError: (e: Error) =>
      toast({
        title: "Delete Error",
        description: e.message,
        variant: "destructive",
      }),
  });

  const checkoutVisitor = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest("POST", `/api/visitors/${id}/checkout`, {});
      return r.json();
    },
    onSuccess: () => {
      fetchVisitors();
      toast({ title: "Visitor checked out successfully" });
    },
    onError: (e: Error) =>
      toast({
        title: "Checkout Error",
        description: e.message,
        variant: "destructive",
      }),
  });

  // Dynamic Schema Fields Layout
  // 🔴 NOTE: `required: true` ko custom variables se hataya taaki native HTML tooltip popup block na kare!
  const visitorFields: FieldConfig[] = [
    { key: "nameOfVisitor", label: "Visitor Name", required: true },
    { 
      key: "contactNo", 
      label: "Contact Number", 
      required: true,
      onChange: (e: any) => {
        const val = e.target.value.trim();
        if (/^\d{10}$/.test(val) && Number(val.charAt(0)) > 5) {
          setErrors(prev => { const copy = { ...prev }; delete copy.contactNo; return copy; });
        }
      }
    },
    { 
      key: "emailAddress", 
      label: "Email Address", 
      type: "email",
      onChange: (e: any) => {
        const val = e.target.value.trim();
        if (!val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setErrors(prev => { const copy = { ...prev }; delete copy.emailAddress; return copy; });
        }
      }
    },
    { key: "visitorsCompanyName", label: "Company Name" },
    { key: "designation", label: "Designation" },
    // {
    //   key: "rfidCardNo",
    //   label: "RFID Card No *", // Label me * manually laga diya styling ke liye
    //   type: "select",
    //   options: visitorCards.map((c: any) => ({
    //     label: c.name || c.cardNumber,
    //     value: c.cardNumber,
    //   })),
    //   onChange: (val: any) => {
    //     if (val && val !== "undefined" && val !== "null") {
    //       setErrors(prev => { const copy = { ...prev }; delete copy.rfidCardNo; return copy; });
    //     }
    //   }
    // },
    
    {
  key: "rfidCardNo",
  label: "RFID Card No *",
  type: "select",
  options: (() => {
    // 1. Available/Unassigned cards map karein (Format: v2 (3062587))
    const opts = visitorCards.map((c: any) => ({
      label: c.name ? `${c.name} (${c.cardNumber || c.card_number})` : (c.cardNumber || c.card_number),
      value: c.cardNumber || c.card_number,
    }));

    // 2. Agar Edit Mode chal raha hai aur assigned card listed nahi hai
    if (editingVisitor) {
      // Check database mapping keys (visitorCardId or visitor_card_id)
      const currentCardId = editingVisitor.visitorCardId || editingVisitor.visitor_card_id;

      // Fallback number agar backend direct string bhej raha ho
      const currentCardNumber = editingVisitor.rfidCardNo || editingVisitor.card_number;

      // Check if this card is already in unassigned dropdown list
      const alreadyExists = opts.some(
        (o: any) =>
          (currentCardNumber && String(o.value).trim() === String(currentCardNumber).trim())
      );

      if (!alreadyExists) {
        // Hum name nikalne ke liye backend response properties use karenge
        const currentCardName = editingVisitor.visitorCardName || editingVisitor.cardName || editingVisitor.card_name;
        
        // Naya Check: Agar permissionDateTo null hai, toh hi "(Currently Assigned)" lagana hai
        const isCurrentlyAssigned = !editingVisitor.permissionDateTo; 
        const suffix = isCurrentlyAssigned ? " (Currently Assigned)" : "";

        // Label structure create karein based on availability of name and number
        let finalLabel = "";
        if (currentCardName && currentCardNumber) {
          finalLabel = `${currentCardName} (${currentCardNumber})${suffix}`;
        } else if (currentCardName) {
          finalLabel = `${currentCardName}${suffix}`;
        } else {
          finalLabel = `${currentCardNumber || 'Assigned Card'}${suffix}`;
        }

        opts.unshift({
          label: finalLabel,
          // Backend payload key match karne ke liye select value card_number honi chahiye
          value: currentCardNumber || "",
        });
      }
    }
    
    return opts;
      })(),
      onChange: (val: any) => {
        if (val && val !== "undefined" && val !== "null") {
          setErrors(prev => { const copy = { ...prev }; delete copy.contactNo; return copy; });
        }
      }
    },
    {
      key: "whomToMeet",
      label: "Whom To Meet (ZIM Employee) *", 
      type: "select",
      options: employees
        .map((e: any) => {
          const name = e.employee_name || e.employeeName || "";
          const code = e.employee_code || e.employeeCode || name;

          return {
            label: `${name} (${code})`,
            value: code,
          };
        })
        .filter((o: any) => o.label.trim() !== ""),
      onChange: (val: any) => {
        if (val && val !== "undefined" && val !== "null") {
          setErrors(prev => { const copy = { ...prev }; delete copy.whomToMeet; return copy; });
        }
      }
    },
    { key: "purpose", label: "Purpose of Visit" },
    {
      key: "permissionDateFrom",
      label: "In Time *",
      type: "datetime-local" as any,
      onChange: (e: any) => {
        const val = e.target.value.trim();
        if (val && val !== "undefined" && val !== "null") {
          setErrors(prev => { const copy = { ...prev }; delete copy.permissionDateFrom; return copy; });
        }
      }
    },
    { key: "state", label: "State" },
    { key: "district", label: "District" },
    { key: "address1", label: "Address Line 1" },
    { key: "pincode", label: "Pincode" },
    { key: "remark", label: "Remark", type: "textarea" },
  ];

  // Grid Table Layout Columns
  const columns = [
    {
      key: "nameOfVisitor",
      label: "Name",
      render: (v: any) => (
        <span className="font-semibold text-foreground">{v.nameOfVisitor}</span>
      ),
    },
    { key: "whomToMeet", label: "Whom To Meet" },
    {
      key: "rfidCardNo",
      label: "RFID Card",
      render: (v: any) => v.rfidCardNo || "-",
    },
    {
      key: "permissionDateFrom",
      label: "In Time",
      render: (v: any) => {
        if (!v.permissionDateFrom) return "-";
        const date = new Date(v.permissionDateFrom);
        return (
          <span className="text-xs text-muted-foreground font-medium">
            {date.toLocaleDateString()}{" "}
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      key: "permissionDateTo",
      label: "Out Time",
      render: (v: any) => {
        if (!v.permissionDateTo) return "-";
        const date = new Date(v.permissionDateTo);
        return (
          <span className="text-xs text-muted-foreground font-medium">
            {date.toLocaleDateString()}{" "}
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (v: any) => (
        <div className="flex items-center space-x-1">
          {/* EXIT BUTTON */}
          <Button
  size="icon"
  variant="ghost"
  title="Mark Exit / Check-out"
  onClick={async (e) => {
    e.stopPropagation();

    // 🌟 CHECK: Agar visitor already check-out ho chuka hai (Out Time majood hai)
    if (v.permissionDateTo) {
      toast({
        title: "Already Checked Out",
        description: `${v.nameOfVisitor} has already logged out at ${new Date(v.permissionDateTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        variant: "destructive", // Ya fir "default" jaisa aapko sahi lage
      });
      return; // Aage ka confirmation block aur mutation trigger nahi hoga 🛑
    }

    // Agar checked-out nahi hai, toh hi confirm box open hoga
    const confirmed = await confirm({
      title: "Mark Visitor Exit?",
      description: `Are you sure you want to check out ${v.nameOfVisitor}? This will update their departure timestamp.`,
      confirmText: "Yes, Check-out",
      cancelText: "Cancel",
      variant: "default",
    });
    if (confirmed) {
      checkoutVisitor.mutate(v.id);
    }
  }}
  disabled={checkoutVisitor.isPending}
>
  {/* 🌟 STYLING OPTION: Agar visitor already logged out hai toh icon thoda fade/gray-out dikhe */}
  <LogOut className={`w-4 h-4 ${v.permissionDateTo ? "text-muted-foreground/50" : "text-emerald-500"}`} />
</Button>

          {/* VIEW BUTTON */}
          <Button
            size="icon"
            variant="ghost"
            title="View Details"
            onClick={(e) => {
              e.stopPropagation();
              setViewingVisitor(v);
              setViewDialogOpen(true);
            }}
          >
            <Eye className="w-4 h-4 text-blue-500" />
          </Button>

          {/* EDIT BUTTON */}
          <Button
            size="icon"
            variant="ghost"
            title="Edit Profile"
            onClick={(e) => {
              e.stopPropagation();
              setEditingVisitor(v);
              setErrors({}); // Edit khulne par errors reset
              setVisitorDialog(true);
            }}
          >
            <Pencil className="w-4 h-4 text-amber-500" />
          </Button>

          {/* DELETE BUTTON */}
          <Button
            size="icon"
            variant="ghost"
            title="Delete Visitor"
            onClick={async (e) => {
              e.stopPropagation();
              const confirmed = await confirm({
                title: "Delete Visitor Profile?",
                description: `Are you sure you want to delete visitor "${v.nameOfVisitor}"? This action cannot be undone and will erase registry details.`,
                confirmText: "Yes, Delete",
                cancelText: "Cancel",
                variant: "destructive",
              });
              if (confirmed) {
                deleteVisitor.mutate(v.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Visitor Details"
        description="Manage visitor profiles and dynamic area clearway access tokens"
      />

      {/* Top Controls Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div className="relative max-w-sm w-full">
          <input
            placeholder="Search registry by name, company, host..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 border rounded-md pl-3 bg-background text-sm outline-none"
          />
        </div>

        <Button
          onClick={() => {
            setEditingVisitor(null);
            setErrors({}); // Fresh form ke liye errors reset
            setVisitorDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Register Visitor
        </Button>
      </div>

      {/* Main Grid View */}
      <DataTable
        columns={columns}
        data={visitorsData}
        isLoading={false}
        searchable={false}
        pageSize={pageSize}
        emptyMessage="No records matching criteria."
      />

      {/* Pagination Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 rounded-b-lg">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, totalCount)}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalCount}</span>{" "}
          entries
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <PaginationSize
            pageSize={pageSize}
            setPageSize={(val) => {
              setPageSize(val);
              setPage(1);
            }}
          />
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
              className="h-8 px-3 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
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

      {/* 1. Register/Edit Profile Dialog Form */}
      <CrudDialog
        open={visitorDialog}
        errors={errors} // Shifts page ki tarah errors object bind kiya!
        onClose={() => {
          setVisitorDialog(false);
          setEditingVisitor(null);
          setErrors({}); // Modal close hone par errors object reset
        }}
        title={
          editingVisitor ? "Modify Visitor Profile" : "Register New Visitor"
        }
        fields={visitorFields}
        initialData={
          editingVisitor
            ? {
                ...editingVisitor,
                rfidCardNo:
                  editingVisitor.rfidCardNo ||
                  visitorCards.find(
                    (c: any) =>
                      Number(c.id) === Number(editingVisitor.visitorCardId),
                  )?.cardNumber,
              }
            : undefined
        }
        onSubmit={(data) => {
  setErrors({}); // Har submission par pehle errors clear karein

  // 1. 🌟 GLOBAL HTML CHECK (Shifts Page ke pattern par object level par call kiya)
  const validationErrors = validateNoHtml(data) || {};

  // Cleaned variables for format checks
  const cleanedVisitorName = String(data.nameOfVisitor || "").trim();
  const cleanedContact = String(data.contactNo || "").trim();
  const cleanedEmail = String(data.emailAddress || "").trim();

  const selectedRfid = String(data.rfidCardNo || "").trim();
  const selectedWhomToMeet = String(data.whomToMeet || "").trim();
  const selectedInTime = String(data.permissionDateFrom || "").trim();

  // 🛑 2. Name Check (Agar validateNoHtml me handle na ho raha ho toh backup)
  if (!cleanedVisitorName) {
    validationErrors.nameOfVisitor = "Visitor name is required.";
  }

  // 🛑 3. RFID Card No Selection Validation
  if (!selectedRfid || selectedRfid === "undefined" || selectedRfid === "null") {
    validationErrors.rfidCardNo = "Please select an RFID Card.";
  }

  // 🛑 4. Whom To Meet Selection Validation
  if (!selectedWhomToMeet || selectedWhomToMeet === "undefined" || selectedWhomToMeet === "null") {
    validationErrors.whomToMeet = "Please select the employee to meet.";
  }

  // 🛑 5. In Time Selection Validation
  if (!selectedInTime || selectedInTime === "undefined" || selectedInTime === "null") {
    validationErrors.permissionDateFrom = "Please select the In Time.";
  }

  // 🛑 6. Contact Number Format Checks
  if (!cleanedContact) {
    validationErrors.contactNo = "Contact number is required.";
  } else if (!/^\d{10}$/.test(cleanedContact)) {
    validationErrors.contactNo = "Contact number must be exactly 10 digits.";
  } else {
    const firstDigit = Number(cleanedContact.charAt(0));
    if (firstDigit <= 5) {
      validationErrors.contactNo = "Contact number must start with 6, 7, 8, or 9.";
    }
  }

  // 🛑 7. Email Validation
  if (cleanedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    validationErrors.emailAddress = "Please enter a valid email address.";
  }

  // If errors exist, reject mutation dispatch sequence 🛑
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return; 
  }

  // Agar saare validations pass ho gaye hain, toh data submit hoga
  if (editingVisitor) {
    updateVisitor.mutate({ id: editingVisitor.id, data });
  } else {
    createVisitor.mutate(data);
  }
}}
        isPending={createVisitor.isPending || updateVisitor.isPending}
      />

      {/* 3. VIEW VISITOR DETAILS DIALOG BLOCK */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {/* HEADER */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-bold leading-none">
                  Visitor Profile
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Detailed registry information for{" "}
                  {viewingVisitor?.nameOfVisitor}
                </p>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 bg-background">
            {viewingVisitor ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Personal & Contact Info */}
                <div className="space-y-3 md:col-span-2 border-b pb-3">
                  <h3 className="font-semibold text-blue-600 text-xs uppercase tracking-wider">
                    Primary Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Visitor Name
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.nameOfVisitor || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Contact Number
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.contactNo || "-"}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground block text-xs">
                        Email Address
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.emailAddress || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visit Information */}
                <div className="space-y-3 md:col-span-2 border-b pb-3">
                  <h3 className="font-semibold text-blue-600 text-xs uppercase tracking-wider">
                    Visit & Corporate Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Company Name
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.visitorsCompanyName || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Designation
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.designation || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Whom To Meet
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.whomToMeet || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Purpose of Visit
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.purpose || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        RFID Card No
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.rfidCardNo || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address Info */}
                <div className="space-y-3 md:col-span-2 border-b pb-3">
                  <h3 className="font-semibold text-blue-600 text-xs uppercase tracking-wider">
                    Address Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground block text-xs">
                        Address
                      </span>
                      <span className="font-medium text-foreground">
                        {[viewingVisitor.address1, viewingVisitor.address2]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        District & State
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.district || "-"},{" "}
                        {viewingVisitor.state || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Pincode
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.pincode || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* System / Additional Info */}
                <div className="space-y-3 md:col-span-2">
                  <h3 className="font-semibold text-blue-600 text-xs uppercase tracking-wider">
                    Additional Meta
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Permission Date
                      </span>
                      <span className="font-medium text-slate-800 text-xs flex flex-col gap-1 mt-1">
                        <div>
                          <strong className="text-emerald-600 font-medium">In: </strong>
                          {viewingVisitor.permissionDateFrom ? (() => {
                            const d = new Date(viewingVisitor.permissionDateFrom);
                            return isNaN(d.getTime())
                              ? viewingVisitor.permissionDateFrom
                              : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                          })() : "-"}
                        </div>
                        <div>
                          <strong className="text-rose-600 font-medium">Out: </strong>
                          {viewingVisitor.permissionDateTo ? (() => {
                            const d = new Date(viewingVisitor.permissionDateTo);
                            return isNaN(d.getTime())
                              ? viewingVisitor.permissionDateTo
                              : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                          })() : "-"}
                        </div>
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Remark
                      </span>
                      <span className="font-medium text-foreground">
                        {viewingVisitor.remark || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No visitor data loaded.
              </p>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 bg-slate-50 border-t flex justify-end">
            <Button
              variant="outline"
              className="rounded-xl px-6"
              onClick={() => {
                setViewDialogOpen(false);
                setViewingVisitor(null);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}