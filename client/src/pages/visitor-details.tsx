import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
} from "lucide-react";
import { PaginationSize } from "@/components/ui/pagination";

export default function VisitorsPage() {
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<any>(null);
  const { toast } = useToast();

  // 1. Pagination & Search States (Single Registry Stream)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [pagedResponse, setPagedResponse] = useState<any>(null);

  // Server-Side Data Fetcher for Visitors Table
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

  // Dynamic Dropdowns Fetching Hooks
  const { data: designations = [] } = useQuery({
    queryKey: ["/api/designations"],
    queryFn: async () => {
      const res = await fetch("/api/designations");
      return res.json();
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      return res.json();
    },
  });

  const { data: visitorCards = [] } = useQuery({
    queryKey: ["/api/visitor_cards_dropdown"], // Alag endpoint ya simple list call
    queryFn: async () => {
      const res = await fetch("/api/visitor_cards?pageSize=1000"); // Saare cards fetch karne ke liye
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

  // Data Fallback and Count Parsers
  const visitorsData = Array.isArray(pagedResponse)
    ? pagedResponse
    : pagedResponse?.data || [];
  const totalCount = pagedResponse?.totalCount || visitorsData.length || 0;
  const totalPages =
    pagedResponse?.totalPages || Math.ceil(totalCount / pageSize) || 1;

  // 2. Mutations
  const createVisitor = useMutation({
    mutationFn: async (d: any) => {
      const r = await apiRequest("POST", "/api/visitors", d);
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
      const r = await apiRequest("PUT", `/api/visitors/${id}`, data);
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

  // 3. Dynamic Schema Fields Layout with Database Options Mapping
  const visitorFields: FieldConfig[] = [
    { key: "nameOfVisitor", label: "Visitor Name", required: true },
    { key: "contactNo", label: "Contact Number", required: true },
    { key: "emailAddress", label: "Email Address", type: "email" },
    { key: "visitorsCompanyName", label: "Company Name" },
    {
      key: "designation",
      label: "Designation",
      type: "select",
      options: designations.map((d: any) => ({ label: d.name, value: d.name })),
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
        .filter((o: any) => o.label !== ""), // Khaali fields ko filter out kar dega
    },
    {
      key: "department",
      label: "Department",
      type: "select",
      options: departments.map((d: any) => ({ label: d.name, value: d.name })),
    },
    { key: "purpose", label: "Purpose of Visit" },
    { key: "permissionDateFrom", label: "Permission From", type: "date" },
    { key: "permissionDateTo", label: "Permission To", type: "date" },
    { key: "address1", label: "Address Line 1", type: "textarea" },
    { key: "address2", label: "Address Line 2" },
    { key: "district", label: "District" },
    { key: "pincode", label: "Pincode" },
    { key: "state", label: "State" },
  ];

  // 4. Grid Table Layout Columns
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
    { key: "department", label: "Dept", hideOnMobile: true },
    { key: "purpose", label: "Purpose", hideOnMobile: true },
    {
      key: "rfidCardNo",
      label: "RFID Card",
      render: (v: any) => v.rfidCardNo || "-",
    },
    {
      key: "validity",
      label: "Validity Period",
      hideOnMobile: true,
      render: (v: any) => (
        <span className="text-xs text-muted-foreground">
          {v.permissionDateFrom || "-"} to {v.permissionDateTo || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (v: any) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setEditingVisitor(v);
            setVisitorDialog(true);
          }}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Visitor Details"
        description="Manage visitor data, company profiles, and custom permissions"
      />

      {/* Top Controls Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          onClick={() => {
            setEditingVisitor(null);
            setVisitorDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Register Visitor
        </Button>
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
      </div>

      {/* Main Reactive Grid Data View */}
      <DataTable
        columns={columns}
        data={visitorsData}
        isLoading={false}
        searchable={false}
        pageSize={pageSize}
        emptyMessage="No visitors records matching criteria."
      />

      {/* Professional Dynamic Pagination Track Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 rounded-b-lg">
        <div className="text-sm text-muted-foreground order-2 md:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, totalCount)}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalCount}</span>{" "}
          registered visitors
        </div>

        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          <div className="flex items-center gap-2">
            <PaginationSize
              pageSize={pageSize}
              setPageSize={(val) => {
                setPageSize(val);
                setPage(1);
              }}
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Go to Page
            </span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= totalPages) setPage(val);
              }}
              className="w-12 h-8 text-center text-sm border rounded-md outline-none bg-background"
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
              <ChevronLeft className="h-4 w-4" /> Prev
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

      {/* Shared Entry Modals */}
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
        initialData={editingVisitor || undefined}
        onSubmit={(data) => {
          if (editingVisitor) {
            updateVisitor.mutate({ id: editingVisitor.id, data });
          } else {
            createVisitor.mutate(data);
          }
        }}
        isPending={createVisitor.isPending || updateVisitor.isPending}
      />
    </div>
  );
}
