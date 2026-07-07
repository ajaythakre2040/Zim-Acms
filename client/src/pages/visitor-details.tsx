import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Plus,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  Eye,
  DoorOpen,
  Trash2,
  UserPlus,
} from "lucide-react";
import { PaginationSize } from "@/components/ui/pagination";

// Shadcn UI Components
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function VisitorsPage() {
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<any>(null);
  const { toast } = useToast();

  // View Modal State
  const [viewingVisitor, setViewingVisitor] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // --- Assign Door (Role Dialog) States ---
  const [roledialogOpen, setRoleDialogOpen] = useState(false);
  const [roleassign, setRoleAssign] = useState<any>(null);
  const [selectedDoorIds, setSelectedDoorIds] = useState<number[]>([]);
  const [doorSearch, setDoorSearch] = useState("");
  const [, setSelectedRoleId] = useState<any>(null); // State synced for close handler cleanups

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

  // --- Doors Access List Fetch Hook ---
  const { data: doors = [], isLoading: isLoadingDoors } = useQuery<any[]>({
    queryKey: ["/api/doors"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/doors");
        return await res.json();
      } catch (e) {
        return [];
      }
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
        // ✅ DB Schema ke hisab se 'visitorCardId' (CamelCase) bhejenge
        visitorCardId: matchingCard ? Number(matchingCard.id) : null,
      };

      const r = await apiRequest("POST", "/api/visitors", payload);
      return r.json();
    },
    onSuccess: () => {
      fetchVisitors();
      setVisitorDialog(false);
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
        // ✅ Edit case me bhi 'visitorCardId' use hoga
        visitorCardId: matchingCard ? Number(matchingCard.id) : null,
      };

      const r = await apiRequest("PUT", `/api/visitors/${id}`, payload);
      return r.json();
    },
    onSuccess: () => {
      fetchVisitors();
      setVisitorDialog(false);
      setEditingVisitor(null);
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

  // Dynamic Schema Fields Layout
  const visitorFields: FieldConfig[] = [
    { key: "nameOfVisitor", label: "Visitor Name", required: true },
    { key: "contactNo", label: "Contact Number", required: true },
    { key: "emailAddress", label: "Email Address", type: "email" },
    { key: "visitorsCompanyName", label: "Company Name" },
    {
      key: "designation",
      label: "Designation",
    },
    {
      key: "rfidCardNo",
      label: "RFID Card No",
      type: "select",
      options: visitorCards.map((c: any) => ({
        label: c.name || c.cardNumber,
        value: c.cardNumber,
      })),
    },
    {
      key: "whomToMeet",
      label: "Whom To Meet (ZIM Employee)",
      required: true,
      type: "select",
      options: employees
        .map((e: any) => {
          const name = e.employee_name || e.employeeName || "";
          return { label: name, value: name };
        })
        .filter((o: any) => o.label !== ""),
    },
    // {
    //   key: "department",
    //   label: "Department",
    //   type: "select",
    //   options: departments.map((d: any) => ({ label: d.name, value: d.name })),
    // },
    { key: "purpose", label: "Purpose of Visit" },

    // ✅ HERE: Added missing Permission Validity Dates
    { key: "permissionDateFrom", label: "Permission Valid From", type: "date" },
    { key: "permissionDateTo", label: "Permission Valid To", type: "date" },

    { key: "district", label: "District" },
    { key: "state", label: "State" },
    { key: "pincode", label: "Pincode" },
    { key: "address1", label: "Address Line 1" },
    { key: "address2", label: "Address Line 2" },
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
    { key: "contactNo", label: "Contact No" },
    { key: "visitorsCompanyName", label: "Company", hideOnMobile: true },
    { key: "whomToMeet", label: "Whom To Meet" },
    { key: "purpose", label: "Purpose", hideOnMobile: true },
    {
      key: "rfidCardNo",
      label: "RFID Card",
      render: (v: any) => v.rfidCardNo || "-",
    },
    {
      key: "permissionDates",
      label: "Validity Period",
      render: (v: any) => (
        <span className="text-xs text-muted-foreground font-medium">
          {v.permissionDateFrom || "-"} to {v.permissionDateTo || "-"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      label: "Actions",
      render: (v: any) => (
        <div className="flex items-center space-x-1">
          {/* 1. VIEW BUTTON */}
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

          {/* 2. NEW ASSIGN DOOR BUTTON */}
          {/* <Button
            size="icon"
            variant="ghost"
            title="Assign Door"
            onClick={(e) => {
              e.stopPropagation();
              setRoleAssign({
                id: v.id, // 👈 visitorId ke liye
                rfidCardNo: v.rfidCardNo, // 👈 visitorCardId find karne ke liye
                name: v.nameOfVisitor,
              });
              setSelectedDoorIds(v.doorIds || []);
              setDoorSearch("");
              setRoleDialogOpen(true);
            }}
          >
            <DoorOpen className="w-4 h-4 text-teal-600" />
          </Button> */}

          {/* 3. EDIT BUTTON */}
          <Button
            size="icon"
            variant="ghost"
            title="Edit Profile"
            onClick={(e) => {
              e.stopPropagation();
              setEditingVisitor(v);
              setVisitorDialog(true);
            }}
          >
            <Pencil className="w-4 h-4 text-amber-500" />
          </Button>

          {/* 4. DELETE BUTTON */}
          <Button
            size="icon"
            variant="ghost"
            title="Delete Visitor"
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(`Are you sure you want to delete ${v.nameOfVisitor}?`)
              ) {
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

      {/* Top Controls Action Toolbar (Fixed Alignment) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        {/* Left Side: Search Input */}
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

        {/* Right Side: Register Button */}
        <Button
          onClick={() => {
            setEditingVisitor(null);
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

      {/* Pagination Footer Component */}
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
        onClose={() => {
          setVisitorDialog(false);
          setEditingVisitor(null);
        }}
        title={
          editingVisitor ? "Modify Visitor Profile" : "Register New Visitor"
        }
        fields={visitorFields}
        initialData={
          editingVisitor 
            ? {
                ...editingVisitor,
                // ✅ Agar backend se visitorCardId aa raha hai toh use dropdown selection ke rfidCardNo me map karenge
                rfidCardNo: editingVisitor.rfidCardNo || visitorCards.find((c: any) => Number(c.id) === Number(editingVisitor.visitorCardId))?.cardNumber
              }
            : undefined
        }
        onSubmit={(data) => {
          if (editingVisitor) {
            updateVisitor.mutate({ id: editingVisitor.id, data });
          } else {
            createVisitor.mutate(data);
          }
        }}
        isPending={createVisitor.isPending || updateVisitor.isPending}
      />

      {/* 2. ASSIGN DOOR DIALOG BLOCK */}
      {/* <Dialog open={roledialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold leading-none">Assign Door</h2>
                <p className="text-blue-100 text-xs mt-1">
                  Assign doors to visitor ({roleassign?.name})
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="relative">
              <input
                placeholder="Search door..."
                value={doorSearch}
                onChange={(e) => setDoorSearch(e.target.value)}
                className="w-full px-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">
                {selectedDoorIds.length} Selected
              </span>
              <div className="flex gap-3">
                <button
                  className="text-[11px] font-bold text-blue-600"
                  onClick={() => setSelectedDoorIds(doors.map((d) => d.id))}
                >
                  Select All
                </button>
                <button
                  className="text-[11px] font-bold text-slate-400"
                  onClick={() => setSelectedDoorIds([])}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="h-[300px] overflow-y-auto rounded-xl border bg-slate-50 p-2">
              {isLoadingDoors ? (
                <p className="text-center text-sm text-muted-foreground">
                  Loading doors...
                </p>
              ) : (
                doors
                  ?.filter((d) =>
                    d.name.toLowerCase().includes(doorSearch.toLowerCase()),
                  )
                  .map((door) => (
                    <div
                      key={door.id}
                      className={`flex items-center gap-3 p-3 mb-1 rounded-lg transition-all cursor-pointer border ${
                        selectedDoorIds.includes(door.id)
                          ? "bg-white border-blue-200 shadow-sm"
                          : "border-transparent hover:bg-white hover:border-slate-200"
                      }`}
                      onClick={() =>
                        setSelectedDoorIds((prev) => {
                          const safePrev = Array.isArray(prev) ? prev : [];
                          return safePrev.includes(door.id)
                            ? safePrev.filter((id) => id !== door.id)
                            : [...safePrev, door.id];
                        })
                      }
                    >
                      <Checkbox
                        checked={
                          Array.isArray(selectedDoorIds) &&
                          selectedDoorIds.includes(Number(door.id))
                        }
                        className="pointer-events-none"
                      />
                      <span
                        className={`text-sm ${
                          selectedDoorIds.includes(door.id)
                            ? "font-bold text-blue-700"
                            : "text-slate-600"
                        }`}
                      >
                        {door.name}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t flex gap-3 justify-end">
            <Button
              variant="outline"
              className="rounded-xl px-6"
              onClick={() => {
                setRoleDialogOpen(false);
                setRoleAssign(null);
                setSelectedRoleId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                try {
                  const matchingCard = visitorCards.find(
                    (c: any) => c.cardNumber === roleassign?.rfidCardNo,
                  );

                  const payload = {
                    visitorId: Number(roleassign?.id),
                    visitorCardId: matchingCard
                      ? Number(matchingCard.id)
                      : null, 
                    doorIds: selectedDoorIds.map(Number),
                  };

                  const response = await apiRequest(
                    "POST",
                    "/api/visitor-door-assignments", // 👈 New API endpoint
                    payload, // 👈 Updated Body
                  );

                  if (response) {
                    toast({
                      title: "Success",
                      description: "Doors assigned to visitor successfully!",
                      variant: "default",
                    });

                    fetchVisitors();

                    setRoleDialogOpen(false);
                    setRoleAssign(null);
                  }
                } catch (error) {
                  console.error("Assignment Error:", error);
                  toast({
                    title: "Error",
                    description:
                      "Failed to assign doors to visitor. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Assign Door
            </Button>
          </div>
        </DialogContent>
      </Dialog> */}

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
                      {/* </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Department</span>
                      <span className="font-medium text-foreground">{viewingVisitor.department || "-"}</span>
                    </div>
                    <div> */}
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
                      <span className="font-medium text-foreground text-xs">
                        {viewingVisitor.permissionDateFrom || "-"} to{" "}
                        {viewingVisitor.permissionDateTo || "-"}
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
