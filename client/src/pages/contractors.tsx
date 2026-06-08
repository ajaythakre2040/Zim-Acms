import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { validateNoHtml } from "@/lib/validation";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

export default function ContractorsPage() {
    const { canAdd, canEdit, canDelete, canView } = usePermission(
        MENU_CONFIG.CONTRACTORS?.code || "contractors",
    );

    if (!canView) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                You do not have permission to view this page.
            </div>
        );
    }

    const confirm = useConfirm();
    const { toast } = useToast();
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);
    const pageSize = 5;
    const [search, setSearch] = useState("");
    const [pagedResponse, setPagedResponse] = useState<any>(null);

    const { isLoading, create, update, remove, isCreating, isUpdating } =
        useCrud<any>("/api/contractors", "Contractor") as any;

    const fetchContractors = async () => {
        const res = await fetch(
            `/api/contractors?page=${page}&pageSize=${pageSize}&search=${search}`,
        );
        const data = await res.json();
        setPagedResponse(data);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchContractors();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search]);

    const data = pagedResponse?.data || [];
    const totalPages = pagedResponse?.totalPages || 1;

    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState<any>(null);

    const columns = [

        {
            key: "contractorName",
            label: "Name",
            render: (item: any) => <span>{item.contractorName}</span>,
        },
        {
            key: "contractorCode",
            label: "Contractor Code",
            render: (item: any) => <span className="font-medium">{item.contractorCode}</span>,
        },
        {
            key: "companyName",
            label: "Vendor Agency",
            render: (item: any) => <span className="text-muted-foreground">{item.companyName}</span>,
        },
        {
            key: "contactNumber",
            label: "Mobile No",
            render: (item: any) => <span className="text-muted-foreground">{item.contactNumber}</span>,
        },
        {
            key: "expiryDate",
            label: "Expiry Date",
            render: (item: any) => <span className="text-muted-foreground">{item.expiryDate}</span>,
        },
        {
            key: "status",
            label: "Status",
            render: (item: any) =>
                item.status === "active" ? (
                    <Badge>Active</Badge>
                ) : (
                    <Badge variant="secondary">Inactive</Badge>
                ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (item: any) => (
                <div className="flex gap-1">
                    {canEdit && (
                        <Button
                            size="icon"
                            variant="ghost"
                            title="Edit Contractor"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEdit(item);
                                setOpen(true);
                            }}
                        >
                            <Pencil className="w-4 h-4 text-blue-500" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            size="icon"
                            variant="ghost"
                            title="Delete Contractor"
                            className="text-destructive"
                            onClick={async (e) => {
                                e.stopPropagation();

                                const confirmed = await confirm({
                                    title: "Delete Contractor?",
                                    description: `Are you sure you want to delete "${item.contractorName}"? This action cannot be undone.`,
                                    confirmText: "Yes, Delete",
                                    cancelText: "Cancel",
                                    variant: "destructive",
                                });

                                if (!confirmed) return;

                                try {
                                    await remove(item.id);

                                    setPagedResponse((prev: any) => {
                                        if (!prev) return prev;
                                        return {
                                            ...prev,
                                            data: prev.data.filter((c: any) => c.id !== item.id),
                                            totalCount: Math.max((prev.totalCount || 1) - 1, 0),
                                        };
                                    });

                                    toast({
                                        title: "Deleted",
                                        description: "Contractor profile removed successfully",
                                    });
                                } catch (err: any) {
                                    toast({
                                        variant: "destructive",
                                        title: "Error",
                                        description: err.message || "Failed to delete contractor",
                                    });
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

    const handleSubmit = async (formData: any) => {
        try {
            setFieldErrors({});

            const validationErrors = validateNoHtml(formData);
            if (Object.keys(validationErrors).length > 0) {
                setFieldErrors(validationErrors);
                return;
            }

            if (edit) {
                await update({ id: edit.id, data: formData });
            } else {
                await create(formData);
            }

            await fetchContractors();

            toast({
                title: "Success",
                description: edit
                    ? "Contractor profile updated successfully"
                    : "Contractor onboarded successfully",
            });

            setOpen(false);
            setEdit(null);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "";

            if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("registered")) {
                setFieldErrors({
                    contractorCode: "This contractor  code is already registered",
                });
                return;
            }

            toast({
                variant: "destructive",
                title: "Error",
                description: msg || "Something went wrong",
            });
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800">
                    Contractor
                </h1>
                <p className="text-sm text-slate-500 font-medium">Manage Contractors</p>
            </div>

            <div className="flex justify-end mb-4">
                {canAdd && (
                    <Button
                        onClick={() => {
                            setEdit(null);
                            setOpen(true);
                        }}
                    >
                        <Plus className="w-4 h-4 mr-1" /> Add Contractor
                    </Button>
                )}
            </div>

            <div className="relative max-w-sm mb-4">
                <input
                    placeholder="Search contractors..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="pl-3 w-full h-9 border rounded-md"
                />
            </div>

            <DataTable columns={columns} data={data} isLoading={isLoading} />

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
                    contractors
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

            <CrudDialog
                open={open}
                onClose={() => {
                    setOpen(false);
                    setEdit(null);
                    setFieldErrors({});
                }}
                title={edit ? "Edit Contractor Profile" : "Onboard New Contractor"}
                fields={[
                    {
                        key: "contractorName",
                        label: "Contractor Name",
                        required: true,
                        onChange: (value, form, setForm) => {
                            setForm({ ...form, contractorName: value });
                            setFieldErrors((prev) => ({ ...prev, contractorName: "" }));
                        },
                    },
                    {
                        key: "contractorCode",
                        label: "Contractor Code",
                        required: true,
                        onChange: (value, form, setForm) => {
                            setForm({ ...form, contractorCode: value });
                            setFieldErrors((prev) => ({ ...prev, contractorCode: "" }));
                        },
                    },
                    {
                        key: "gender",
                        label: "Gender",
                        type: "select",
                        options: [
                            { label: "Male", value: "Male" },
                            { label: "Female", value: "Female" },
                            { label: "Other", value: "Other" },
                        ],
                        defaultValue: "Male",
                        required: true,
                    },
                    { key: "aadhaarNumber", label: "Aadhaar Card No (12 Digits)" },
                    { key: "contactNumber", label: "Mobile Number", required: true },
                    { key: "email", label: "Email Address", type: "email" },
                    { key: "address", label: "Full Address", type: "textarea" },
                    { key: "companyName", label: "Vendor / Agency Name", required: true },
                    { key: "startDate", label: "Contract Start Date", type: "date", required: true },
                    { key: "expiryDate", label: "Contract Expiry Date", type: "date", required: true },
                    { key: "biometricId", label: "Biometric Card / ID" },
                    {
                        key: "status",
                        label: "Status",
                        type: "select",
                        options: [
                            { label: "Active", value: "active" },
                            { label: "Inactive", value: "inactive" },
                        ],
                        defaultValue: "active",
                        required: true,
                    },
                ]}
                initialData={edit || undefined}
                onSubmit={handleSubmit}
                isPending={isCreating || isUpdating}
                errors={fieldErrors}
            />
        </div>
    );
}