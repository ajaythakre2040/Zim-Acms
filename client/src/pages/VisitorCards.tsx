import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { usePermission } from "@/hooks/use-permission";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { validateNoHtml } from "@/lib/validation";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Pencil,
  Trash2,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  RotateCw,
  UserCheck,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MENU_CONFIG } from "../../../server/constant";
import { PaginationSize } from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";

const formatDateForInput = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export default function VisitorCardsPage() {
  const { canEdit, canDelete, canView } = usePermission(
    MENU_CONFIG.VISITOR_CARDS.code,
  );

  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Card Editing States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Assign Visitor Dialog States
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<any>(null);
  const [selectedCardForAssign, setSelectedCardForAssign] = useState<any>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formKey, setFormKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // CRUD Hooks for Visitor Cards
  const { isLoading, update, remove, isUpdating } = useCrud<any>(
    `/api/visitor_cards`,
    "Visitor Card",
  ) as any;

  // CRUD Hooks for Visitors Registration
  const { create: createVisitor, update: updateVisitor } = useCrud<any>(
    `/api/visitors`,
    "Visitor",
  ) as any;

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/people");
      const resData = await res.json();
      return Array.isArray(resData) ? resData : resData?.data || [];
    },
  });

  const [pagedResponse, setPagedResponse] = useState<any>(null);
  const [visitorCards, setVisitorCards] = useState<any[]>([]);

  const fetchVisitorCards = async () => {
    try {
      const res = await fetch(
        `/api/visitor_cards?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
      );
      const resData = await res.json();
      setPagedResponse(resData);
      if (Array.isArray(resData)) {
        setVisitorCards(resData);
      } else if (resData?.data) {
        setVisitorCards(resData.data);
      }
    } catch (error) {
      console.error("Fetcher execution broke:", error);
    }
  };

  useEffect(() => {
    fetchVisitorCards();
    handleSync();
  }, [page, search, pageSize]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/visitor_cards/sync", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Sync operation failed");
      }
      await fetchVisitorCards();
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync cards from MSSQL");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  const cardsData = Array.isArray(pagedResponse)
    ? pagedResponse
    : pagedResponse?.data || [];

  const totalCount = pagedResponse?.totalCount || cardsData.length || 0;
  const totalPages =
    pagedResponse?.totalPages || Math.ceil(totalCount / pageSize) || 1;

  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const copy = { ...prev };
      delete copy[fieldName];
      return copy;
    });
  };

  // 1. Visitor Card Fields Configuration
  const fields: FieldConfig[] = [
    { key: "name", label: "Card Code", required: true },
    {
      key: "cardNumber",
      label: "Card Number",
      required: true,
      disabled: !!editing,
    },
    { key: "expiryFrom", label: "Expiry From", type: "date" },
    { key: "expiryTo", label: "Expiry To", type: "date" },
    { key: "location", label: "Location ID", type: "number" },
  ];

  // 2. Visitor Form Fields
  const visitorFields: FieldConfig[] = [
    { key: "nameOfVisitor", label: "Visitor Name", required: true },
    {
      key: "contactNo",
      label: "Contact Number",
      required: true,
      onChange: (e: any) => {
        const val = e.target.value.trim();
        if (/^\d{10}$/.test(val) && Number(val.charAt(0)) > 5) {
          clearFieldError("contactNo");
        }
      },
    },
    {
      key: "emailAddress",
      label: "Email Address",
      type: "email",
      onChange: (e: any) => {
        const val = e.target.value.trim();
        if (!val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          clearFieldError("emailAddress");
        }
      },
    },
    { key: "visitorsCompanyName", label: "Company Name" },
    { key: "designation", label: "Designation" },
    {
      key: "whomToMeet",
      label: "Whom To Meet (ZIM Employee) *",
      type: "select",
      options: (employees || [])
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
          clearFieldError("whomToMeet");
        }
      },
    },
    { key: "purpose", label: "Purpose of Visit" },
    {
      key: "permissionDateFrom",
      label: "In Time *",
      type: "datetime-local" as any,
      onChange: (e: any) => {
        const val = e.target.value.trim();
        if (val && val !== "undefined" && val !== "null") {
          clearFieldError("permissionDateFrom");
        }
      },
    },
    { key: "state", label: "State" },
    { key: "district", label: "District" },
    { key: "address1", label: "Address Line 1" },
    { key: "pincode", label: "Pincode" },
    { key: "remark", label: "Remark", type: "textarea" },
  ];

  // 3. Grid Columns
  const columns = [
    {
      key: "name",
      label: "Card Code",
      render: (s: any) => <span className="font-medium">{s.name}</span>,
    },
    { key: "cardNumber", label: "Card Number" },
    {
      key: "expiryFrom",
      label: "Valid From",
      render: (s: any) =>
        s.expiryFrom ? new Date(s.expiryFrom).toLocaleDateString() : "-",
    },
    {
      key: "expiryTo",
      label: "Valid To",
      render: (s: any) =>
        s.expiryTo ? new Date(s.expiryTo).toLocaleDateString() : "-",
    },
    {
      key: "actions",
      label: "Actions",
      render: (s: any) => {
        return (
          <TooltipProvider delayDuration={100}>
            <div className="flex gap-1 items-center">
              {/* Assign Visitor Action Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingVisitor(null);
                        setSelectedCardForAssign(s);
                        setErrors({});
                        setVisitorDialog(true);
                      }}
                    >
                      <UserCheck className="w-4 h-4 text-green-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Assign Visitor</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Device Access Status Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Device Access Status</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Assign Door Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Assign Door</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Edit Action Button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(s);
                        setFormKey((prev) => prev + 1);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Delete Action Button */}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:text-destructive text-red-500"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = await confirm({
                          title: "Delete Visitor Card?",
                          description: `Are you sure you want to delete card "${s.name}"? This action cannot be undone.`,
                          confirmText: "Yes, Delete",
                          cancelText: "Cancel",
                          variant: "destructive",
                        });

                        if (!confirmed) return;

                        try {
                          await remove(s.id);
                          setPagedResponse((prev: any) => {
                            if (!prev) return prev;
                            if (Array.isArray(prev)) {
                              return prev.filter((item: any) => item.id !== s.id);
                            }
                            return {
                              ...prev,
                              data: prev.data
                                ? prev.data.filter((item: any) => item.id !== s.id)
                                : [],
                              totalCount: prev.totalCount ? prev.totalCount - 1 : 0,
                            };
                          });
                          await fetchVisitorCards();
                        } catch (err) {
                          console.error("Failed to delete card:", err);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      },
    },
  ].filter((col) => {
    if (col.key === "actions") {
      return canEdit || canDelete;
    }
    return true;
  });

  const getPreparedInitialData = () => {
    if (!editing) return undefined;
    return {
      ...editing,
      expiryFrom: formatDateForInput(editing.expiryFrom),
      expiryTo: formatDateForInput(editing.expiryTo),
    };
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto [&_label.text-destructive]:text-foreground [&_input.border-destructive]:border-input [&_input.border-destructive]:focus-visible:ring-ring [&_td]:py-2 [&_th]:py-2">
      <PageHeader
        title="Visitor Cards"
        description="Manage RFID/Visitor cards and their expiry"
        action={
          <Button
            onClick={handleSync}
            disabled={isSyncing || isLoading}
            variant="default"
          >
            <RotateCw
              className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Cards"}
          </Button>
        }
      />

      <div className="relative max-w-sm mb-4">
        <input
          placeholder="Search cards..."
          value={search}
          onChange={(e) => {
            const cleanValue = e.target.value.replace(/^\/+/, "");
            setSearch(cleanValue);
            setPage(1);
          }}
          className="w-full h-9 border rounded-md pl-3 bg-background text-sm outline-none"
        />
      </div>

      <DataTable
        columns={columns}
        data={cardsData}
        isLoading={isLoading || isSyncing}
        searchable={false}
        pageSize={pageSize}
        emptyMessage="No visitor cards found."
      />

      {/* Pagination Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
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
          cards
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

      {/* Edit Visitor Card Dialog */}
      {canEdit && (
        <CrudDialog
          key={formKey}
          open={dialogOpen}
          errors={errors}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
            setErrors({});
          }}
          title="Edit Visitor Card"
          fields={fields}
          initialData={getPreparedInitialData()}
          onSubmit={async (formData) => {
            if (!canEdit) return;
            try {
              setErrors({});

              let validationErrors: Record<string, string> = {};

              const htmlTagErrors = validateNoHtml(formData);
              if (Object.keys(htmlTagErrors).length > 0) {
                validationErrors = { ...validationErrors, ...htmlTagErrors };
              }

              if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
              }

              const payload = {
                ...formData,
                location: formData.location ? Number(formData.location) : 0,
                expiryFrom: formData.expiryFrom
                  ? new Date(formData.expiryFrom)
                  : null,
                expiryTo: formData.expiryTo
                  ? new Date(formData.expiryTo)
                  : null,
              };

              await update({ id: editing.id, data: payload });
              await fetchVisitorCards();
              setDialogOpen(false);
              setEditing(null);
            } catch (err: any) {
              console.error("Operation failed details:", err);
              const errorMessage = err?.message || "";
              if (errorMessage.includes("Duplicate card number")) {
                setErrors({
                  cardNumber:
                    "This Card Number already exists. Duplicate not allowed.",
                });
              } else {
                setErrors({ general: errorMessage || "Operation failed" });
              }
            }
          }}
          isPending={isUpdating}
        />
      )}

      {/* Assign Visitor / Register Visitor Dialog */}
      <CrudDialog
        open={visitorDialog}
        errors={errors}
        onClose={() => {
          setVisitorDialog(false);
          setEditingVisitor(null);
          setSelectedCardForAssign(null);
          setErrors({});
        }}
        title={
          editingVisitor
            ? "Modify Visitor Profile"
            : selectedCardForAssign
            ? `Assign Visitor to Card (${selectedCardForAssign.name || selectedCardForAssign.cardNumber})`
            : "Register New Visitor"
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
            : selectedCardForAssign
            ? {
                rfidCardNo: selectedCardForAssign.cardNumber || selectedCardForAssign.id,
                visitorCardId: selectedCardForAssign.id,
              }
            : undefined
        }
        onSubmit={async (data) => {
          setErrors({});

          const validationErrors = validateNoHtml(data) || {};

          const cleanedVisitorName = String(data.nameOfVisitor || "").trim();
          const cleanedContact = String(data.contactNo || "").trim();
          const cleanedEmail = String(data.emailAddress || "").trim();

          const selectedRfid = String(data.rfidCardNo || "").trim();
          const selectedWhomToMeet = String(data.whomToMeet || "").trim();
          const selectedInTime = String(data.permissionDateFrom || "").trim();

          if (!cleanedVisitorName) {
            validationErrors.nameOfVisitor = "Visitor name is required.";
          }

          if (
            !selectedRfid ||
            selectedRfid === "undefined" ||
            selectedRfid === "null"
          ) {
            validationErrors.rfidCardNo = "Please select an RFID Card.";
          }

          if (
            !selectedWhomToMeet ||
            selectedWhomToMeet === "undefined" ||
            selectedWhomToMeet === "null"
          ) {
            validationErrors.whomToMeet = "Please select the employee to meet.";
          }

          if (
            !selectedInTime ||
            selectedInTime === "undefined" ||
            selectedInTime === "null"
          ) {
            validationErrors.permissionDateFrom = "Please select the In Time.";
          }

          if (!cleanedContact) {
            validationErrors.contactNo = "Contact number is required.";
          } else if (!/^\d{10}$/.test(cleanedContact)) {
            validationErrors.contactNo =
              "Contact number must be exactly 10 digits.";
          } else {
            const firstDigit = Number(cleanedContact.charAt(0));
            if (firstDigit <= 5) {
              validationErrors.contactNo =
                "Contact number must start with 6, 7, 8, or 9.";
            }
          }

          if (
            cleanedEmail &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)
          ) {
            validationErrors.emailAddress =
              "Please enter a valid email address.";
          }

          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }

          const payload = {
            ...data,
            visitorCardId: selectedCardForAssign?.id || data.visitorCardId,
          };

          try {
            if (editingVisitor) {
              if (updateVisitor?.mutateAsync) {
                await updateVisitor.mutateAsync({ id: editingVisitor.id, data: payload });
              } else if (updateVisitor?.mutate) {
                updateVisitor.mutate({ id: editingVisitor.id, data: payload });
              }
            } else {
              if (createVisitor?.mutateAsync) {
                await createVisitor.mutateAsync(payload);
              } else if (createVisitor?.mutate) {
                createVisitor.mutate(payload);
              }
            }

            setVisitorDialog(false);
            setEditingVisitor(null);
            setSelectedCardForAssign(null);
            await fetchVisitorCards();
          } catch (err: any) {
            console.error("Visitor operation failed:", err);
            setErrors({ general: err?.message || "Failed to submit visitor details" });
          }
        }}
        isPending={createVisitor?.isPending || updateVisitor?.isPending}
      />
    </div>
  );
}