import { useState, useEffect } from "react";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationSize } from "@/components/ui/pagination";
import {
    Eye, Plus, Pencil, Trash2, ChevronsLeft, ChevronLeft,
    ChevronRight, ChevronsRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";
import { navigate } from "wouter/use-browser-location";

export default function ContractorsPage() {
    const { canAdd, canEdit, canDelete, canView } = usePermission(MENU_CONFIG.CONTRACTORS?.code || "contractors");
    const { toast } = useToast();

    // States
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [pagedResponse, setPagedResponse] = useState<any>({ data: [], totalPages: 1, totalCount: 0 });
    const [isLoading, setIsLoading] = useState(false);

    // Dialogs
    const [open, setOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [edit, setEdit] = useState<any>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const fetchContractors = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/contractors?page=${page}&pageSize=${pageSize}&search=${search}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            setPagedResponse(await res.json());
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this contractor?")) return;
        try {
            const res = await fetch(`/api/contractors/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast({ title: "Success", description: "Deleted successfully" });
            fetchContractors();
        } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    };

    // ⬇️ UPDATE HANDLER MEIN DATE FIX KIYA HAI ⬇️
    const handleSubmit = async (formData: any) => {
        try {
            const formatDialogDate = (dateVal: any) => {
                if (!dateVal || dateVal === "") return null;
                let cleanVal = dateVal;
                if (typeof dateVal === 'string') {
                    cleanVal = dateVal.split('T')[0];
                }
                const parsedDate = new Date(cleanVal);
                return (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) ? parsedDate.toISOString() : null;
            };

            // Payload prepare karte waqt dates ko safe standard format mein badal diya
            const payload = {
                ...formData,
                startDate: formatDialogDate(formData.startDate),
                expiryDate: formatDialogDate(formData.expiryDate),
                commencementDate: formatDialogDate(formData.commencementDate || formData.startDate),
                agreementFromDate: formatDialogDate(formData.agreementFromDate || formData.startDate),
                agreementValidUpto: formatDialogDate(formData.agreementValidUpto || formData.expiryDate),
                licenseValidity: formatDialogDate(formData.licenseValidity || formData.expiryDate),
            };

            const response = await fetch(edit ? `/api/contractors/${edit.id}` : "/api/contractors", {
                method: edit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload), // <-- Yahan payload jayega formData ki jagah
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: "Operation failed" }));
                throw new Error(err.message);
            }
            toast({ title: "Success", description: "Saved successfully" });
            setOpen(false);
            setEdit(null);
            fetchContractors();
        } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    };

    useEffect(() => {
        const timer = setTimeout(fetchContractors, 300);
        return () => clearTimeout(timer);
    }, [page, pageSize, search]);

    const columns = [
        { key: "contractorName", label: "Contractor Name" },
        { key: "contractorCode", label: "Code" },
        { key: "companyName", label: "Agency" },
        { key: "status", label: "Status", render: (i: any) => <Badge variant={i.status === 'active' ? "default" : "secondary"}>{i.status}</Badge> },
        {
            key: "actions", label: "Actions", render: (item: any) => (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setViewOpen(true); }}><Eye className="w-4 h-4" /></Button>
                    {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/contractors/edit/${item.id}`)}>
                            <Pencil className="w-4 h-4" />
                        </Button>
                    )}
                    {canDelete && <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
            )
        }
    ];

    const totalPages = pagedResponse?.totalPages || 1;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black">Contractors</h1>
                {canAdd && (
                    <Button onClick={() => navigate("/contractors/new")}>
                        <Plus className="mr-2 w-4 h-4" /> Add Contractor
                    </Button>
                )}
            </div>

            <input className="mb-4 border rounded p-2 w-full max-w-sm" placeholder="Search..." onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <DataTable columns={columns} data={pagedResponse?.data || []} isLoading={isLoading} />

            {/* Professional Pagination */}
            <div className="flex items-center justify-between border-t mt-4 pt-4 bg-slate-50/50 p-4 rounded-b-lg">
                <div className="text-sm text-slate-500 font-medium">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, pagedResponse?.totalCount || 0)} of {pagedResponse?.totalCount || 0} records</div>
                <div className="flex items-center gap-4">
                    <PaginationSize pageSize={pageSize} setPageSize={(val) => { setPageSize(val); setPage(1); }} />
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Go to Page</span>
                        <input type="number" min={1} max={totalPages} value={page} className="w-12 h-8 text-center text-sm border rounded"
                            onChange={(e) => { const val = Number(e.target.value); if (val >= 1 && val <= totalPages) setPage(val); }} />
                    </div>
                    <div className="flex items-center space-x-1">
                        <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="px-4 py-2 font-bold text-sm bg-white border rounded">{page} / {totalPages}</div>
                        <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            {/* Details Dialog Viewer */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>Contractor Details</DialogTitle></DialogHeader>
                    {selectedItem && (
                        <div className="grid grid-cols-2 gap-4 text-sm max-h-[70vh] overflow-y-auto p-1">
                            {[
                                { l: "Contractor Name", v: "contractorName" },
                                { l: "Contractor Code", v: "contractorCode" },
                                { l: "Agency Name", v: "companyName" },
                                { l: "Mobile No", v: "contactNumber" },
                                { l: "Email Address", v: "email" },
                                { l: "Start Date", v: "startDate" },
                                { l: "Expiry Date", v: "expiryDate" },
                                { l: "Status", v: "status" }
                            ].map(f => (
                                <div key={f.l}><span className="block text-slate-400 font-bold uppercase text-xs">{f.l}</span>{selectedItem[f.v] || "N/A"}</div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add/Edit Form Dialog */}
            <CrudDialog open={open} onClose={() => { setOpen(false); setEdit(null); }} title={edit ? "Edit" : "Add"} onSubmit={handleSubmit} initialData={edit} fields={[
                { key: "contractorName", label: "Contractor Name", required: true },
                { key: "contractorCode", label: "Contractor Code", required: true, disabled: !!edit },
                { key: "companyName", label: "Agency Name", required: true },
                { key: "contactNumber", label: "Mobile", required: true },
                { key: "email", label: "Email Address" },
                { key: "startDate", label: "Start Date", type: "date", required: true },
                { key: "expiryDate", label: "Expiry Date", type: "date", required: true },
                { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] }
            ]} />
        </div>
    );
}