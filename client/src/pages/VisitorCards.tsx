import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { usePermission } from "@/hooks/use-permission";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog, type FieldConfig } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
} from "lucide-react";
import { MENU_CONFIG } from "../../../server/constant";
import { PaginationSize } from "@/components/ui/pagination";

// 🌟 HELPER FUNCTION: Timestamp ko YYYY-MM-DD format me convert karne ke liye taaki input autofill ho sake
const formatDateForInput = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0]; // returns "YYYY-MM-DD"
};

export default function VisitorCardsPage() {
  // 1. Permission handles
  const { canAdd, canEdit, canDelete, canView } = usePermission(
    MENU_CONFIG.VISITOR_CARDS.code,
  );

  if (!canView) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formKey, setFormKey] = useState(0);

  const { isLoading, create, update, remove, isCreating, isUpdating } =
    useCrud<any>(`/api/visitor_cards`, "Visitor Card") as any;

  const [pagedResponse, setPagedResponse] = useState<any>(null);

  const fetchVisitorCards = async () => {
    try {
      const res = await fetch(
        `/api/visitor_cards?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
      );
      const resData = await res.json();
      setPagedResponse(resData);
    } catch (error) {
      console.error("Fetcher execution broke:", error);
    }
  };

  useEffect(() => {
    fetchVisitorCards();
  }, [page, search, pageSize]);

  const cardsData = Array.isArray(pagedResponse)
    ? pagedResponse
    : pagedResponse?.data || [];

  const totalCount = pagedResponse?.totalCount || cardsData.length || 0;
  const totalPages =
    pagedResponse?.totalPages || Math.ceil(totalCount / pageSize) || 1;

  // 2. Form Fields Schema
  const fields: FieldConfig[] = [
    { key: "name", label: "Card Name", required: true },
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

  // 3. Grid Columns
  const columns = [
    {
      key: "name",
      label: "Card Name",
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
      render: (s: any) => (
        <div className="flex gap-1">
          {canEdit && (
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
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
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

                  // 🔥 UI ko instant bina refresh update karne ke liye state se pehle hi filter kar do
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
                  // Silent fail safe ya user notification handler (Agar use karna ho)
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ].filter((col) => {
    if (col.key === "actions") {
      return canEdit || canDelete;
    }
    return true;
  });

  // 🌟 FIX: Data formats map kar rahe hain dialog me bhejne se pehle taaki HTML Input Date handle ho sake
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
          canAdd && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormKey((prev) => prev + 1);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Card
            </Button>
          )
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
        isLoading={isLoading}
        searchable={false}
        pageSize={pageSize}
        emptyMessage="No visitor cards found."
      />

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

      {(canAdd || canEdit) && (
        <CrudDialog
          key={formKey}
          open={dialogOpen}
          errors={errors}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
            setErrors({});
          }}
          title={editing ? "Edit Visitor Card" : "Add New Visitor Card"}
          fields={fields}
          initialData={getPreparedInitialData()} // 🌟 FIX: Ab formatting ke sath date pass hogi
          onSubmit={async (formData) => {
            if ((editing && !canEdit) || (!editing && !canAdd)) return;
            try {
              setErrors({});
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

              if (editing) {
                await update({ id: editing.id, data: payload });
              } else {
                await create(payload);
              }

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
          isPending={isCreating || isUpdating}
        />
      )}
    </div>
  );
}
