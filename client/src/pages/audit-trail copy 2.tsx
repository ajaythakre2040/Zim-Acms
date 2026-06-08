import { useState, useEffect } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ChevronsRight,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    Eye,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";

export default function AuditTrailPage() {
    const { canView } = usePermission(MENU_CONFIG.AUDIT_TRAIL?.code || "audit_01");

    if (!canView) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                You do not have permission to view this page.
            </div>
        );
    }

    const pageSize = 10;

    const [auditPage, setAuditPage] = useState(1);
    const [auditSearch, setAuditSearch] = useState("");
    const [auditResponse, setAuditResponse] = useState<any>(null);
    const [auditLoading, setAuditLoading] = useState(false);

    const [loginPage, setLoginPage] = useState(1);
    const [loginSearch, setLoginSearch] = useState("");
    const [loginResponse, setLoginResponse] = useState<any>(null);
    const [loginLoading, setLoginLoading] = useState(false);

    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

    const fetchAuditLogs = async () => {
        try {
            setAuditLoading(true);
            const res = await fetch(
                `/api/audit-logs?page=${auditPage}&pageSize=${pageSize}&search=${auditSearch}`,
            );
            const data = await res.json();
            setAuditResponse(data);
        } catch (err) {
            console.error(err);
        } finally {
            setAuditLoading(false);
        }
    };

    const fetchLoginLogs = async () => {
        try {
            setLoginLoading(true);
            const res = await fetch(
                `/api/login-logs?page=${loginPage}&pageSize=${pageSize}&search=${loginSearch}`,
            );
            const data = await res.json();
            setLoginResponse(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoginLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAuditLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [auditPage, auditSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLoginLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [loginPage, loginSearch]);

    const auditData = auditResponse?.data || [];
    const auditTotalPages = auditResponse?.totalPages || 1;

    const loginData = loginResponse?.data || [];
    const loginTotalPages = loginResponse?.totalPages || 1;

    const handleOpenDetails = (log: any) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const handleOpenSessionDetails = (session: any) => {
        setSelectedSession(session);
        setIsSessionModalOpen(true);
    };

    const auditColumns = [
        {
            key: "id",
            label: "Log ID",
            render: (item: any) => <span className="font-bold text-indigo-600">#{item.id}</span>,
        },
        {
            key: "tableName",
            label: "Module / Table",
            render: (item: any) => <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">{item.tableName}</span>,
        },
        {
            key: "action",
            label: "Action",
            render: (item: any) => {
                const action = item.action?.toUpperCase();
                if (action === "EDIT" || action === "UPDATE") {
                    return <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 font-bold tracking-wide shadow-sm">EDIT</Badge>;
                }
                if (action === "ADD/EDIT" || action === "CREATE/UPDATE") {
                    return <Badge className="bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200 font-bold tracking-wide shadow-sm">ADD/EDIT</Badge>;
                }
                if (action === "INSERT" || action === "CREATE") {
                    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 font-bold tracking-wide shadow-sm">CREATE</Badge>;
                }
                if (action === "DELETE") {
                    return <Badge className="bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200 font-bold tracking-wide shadow-sm">DELETE</Badge>;
                }
                return <Badge variant="outline" className="font-bold tracking-wide">{action}</Badge>;
            },
        },
        {
            key: "userId",
            label: "Performed By",
            render: (item: any) => <span className="text-violet-700 font-semibold bg-violet-50 px-2 py-0.5 rounded-full text-xs border border-violet-100">{item.username || item.userId || "System"}</span>,
        },
        {
            key: "createdAt",
            label: "Timestamp",
            render: (item: any) => (
                <span className="text-slate-500 text-sm font-medium">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Action",
            render: (item: any) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 p-0 shadow-none transition-colors"
                    onClick={() => handleOpenDetails(item)}
                >
                    <Eye className="h-5 w-5" />
                </Button>
            ),
        },
    ];

    const loginColumns = [
        {
            key: "username",
            label: "Username",
            render: (item: any) => <span className="font-bold text-slate-700">{item.username || "System"}</span>,
        },
        {
            key: "ipAddress",
            label: "IP Address",
            render: (item: any) => <span className="text-cyan-700 font-mono text-sm bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">{item.ipAddress || "-"}</span>,
        },
        {
            key: "status",
            label: "Status",
            render: (item: any) => {
                const status = item.status?.toUpperCase();
                if (status === "LOGIN" || status === "ACTIVE") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 font-bold">LOGGED IN</Badge>;
                if (status === "LOGOUT") return <Badge className="bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 font-bold">LOGGED OUT</Badge>;
                return <Badge variant="outline" className="font-bold">{item.status}</Badge>;
            },
        },
        {
            key: "createdAt",
            label: "Login Time",
            render: (item: any) => (
                <span className="text-slate-600 text-sm font-medium">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                </span>
            ),
        },
        {
            key: "logoutAt",
            label: "Logout Time",
            render: (item: any) => (
                <span className="text-sm font-medium">
                    {item.logoutAt ? (
                        <span className="text-rose-600 font-medium">{new Date(item.logoutAt).toLocaleString()}</span>
                    ) : (
                        <span className="text-emerald-600 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full animate-pulse">ACTIVE SESSION</span>
                    )}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Action",
            render: (item: any) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 p-0 shadow-none transition-colors"
                    onClick={() => handleOpenSessionDetails(item)}
                >
                    <Eye className="h-5 w-5" />
                </Button>
            ),
        },
    ];

    return (
        <div className="p-4 md:p-6 bg-slate-50/50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-slate-800">
                    Audit Trail
                </h1>
                <p className="text-sm text-slate-500 font-medium">Monitor system activity and session logs</p>
            </div>

            <Tabs defaultValue="activity" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-semibold transition-all">Activity Logs</TabsTrigger>
                    <TabsTrigger value="sessions" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-semibold transition-all">Login Sessions</TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                    <div className="relative max-w-sm mb-4">
                        <input
                            placeholder="Search activity logs..."
                            value={auditSearch}
                            onChange={(e) => {
                                setAuditSearch(e.target.value);
                                setAuditPage(1);
                            }}
                            className="pl-3 w-full h-9 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        />
                    </div>

                    <DataTable columns={auditColumns} data={auditData} isLoading={auditLoading} />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-slate-100 bg-slate-50/50 mt-4 rounded-b-lg">
                        <div className="text-sm text-slate-500 order-2 md:order-1 font-medium">
                            Showing <span className="font-bold text-slate-800">{(auditPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-800">{Math.min(auditPage * pageSize, auditResponse?.totalCount || 0)}</span> of <span className="font-bold text-slate-800">{auditResponse?.totalCount || 0}</span> records
                        </div>

                        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Go to Page</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={auditTotalPages}
                                    defaultValue={auditPage}
                                    className="w-12 h-8 text-center text-sm font-bold border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            const val = Number(e.currentTarget.value);
                                            if (val >= 1 && val <= auditTotalPages) setAuditPage(val);
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => setAuditPage(1)} disabled={auditPage === 1}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold gap-1 text-slate-600 border-slate-200 shadow-sm" onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage === 1}>
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </Button>
                                <div className="flex items-center justify-center min-w-[80px] h-8 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-xs font-bold shadow-sm px-2">
                                    {auditPage} / {auditTotalPages}
                                </div>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold gap-1 text-slate-600 border-slate-200 shadow-sm" onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))} disabled={auditPage === auditTotalPages}>
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => setAuditPage(auditTotalPages)} disabled={auditPage === auditTotalPages}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="sessions" className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                    <div className="relative max-w-sm mb-4">
                        <input
                            placeholder="Search session logs..."
                            value={loginSearch}
                            onChange={(e) => {
                                setLoginSearch(e.target.value);
                                setLoginPage(1);
                            }}
                            className="pl-3 w-full h-9 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        />
                    </div>

                    <DataTable columns={loginColumns} data={loginData} isLoading={loginLoading} />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-slate-100 bg-slate-50/50 mt-4 rounded-b-lg">
                        <div className="text-sm text-slate-500 order-2 md:order-1 font-medium">
                            Showing <span className="font-bold text-slate-800">{(loginPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-800">{Math.min(loginPage * pageSize, loginResponse?.totalCount || 0)}</span> of <span className="font-bold text-slate-800">{loginResponse?.totalCount || 0}</span> sessions
                        </div>

                        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Go to Page</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={loginTotalPages}
                                    defaultValue={loginPage}
                                    className="w-12 h-8 text-center text-sm font-bold border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            const val = Number(e.currentTarget.value);
                                            if (val >= 1 && val <= loginTotalPages) setLoginPage(val);
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => setLoginPage(1)} disabled={loginPage === 1}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold gap-1 text-slate-600 border-slate-200 shadow-sm" onClick={() => setLoginPage((p) => Math.max(1, p - 1))} disabled={loginPage === 1}>
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </Button>
                                <div className="flex items-center justify-center min-w-[80px] h-8 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-xs font-bold shadow-sm px-2">
                                    {loginPage} / {loginTotalPages}
                                </div>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold gap-1 text-slate-600 border-slate-200 shadow-sm" onClick={() => setLoginPage((p) => Math.min(loginTotalPages, p + 1))} disabled={loginPage === loginTotalPages}>
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => setLoginPage(loginTotalPages)} disabled={loginPage === loginTotalPages}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* 🔥 ACTIVITY LOGS DETAILS VIEW MODAL */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold border-b pb-3 text-slate-800">
                            Audit Log Details <span className="text-indigo-600 font-extrabold">(Log #{selectedLog?.id})</span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm font-medium">
                                <div>
                                    <span className="text-slate-400 block text-xs font-bold uppercase tracking-wide">Module / Table</span>
                                    <span className="text-slate-800 font-semibold">{selectedLog.tableName}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-xs font-bold uppercase tracking-wide">Action Performed</span>
                                    <span className="text-slate-800 font-semibold">{selectedLog.action}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-xs font-bold uppercase tracking-wide">Record ID Affected</span>
                                    <span className="text-indigo-600 font-bold">#{selectedLog.recordId}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-xs font-bold uppercase tracking-wide">Performed By</span>
                                    <span className="text-violet-700 font-bold">{selectedLog.username || "System"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-xs font-bold uppercase tracking-wide">IP Address</span>
                                    <span className="font-mono text-cyan-700">{selectedLog.ipAddress || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-xs font-bold uppercase tracking-wide">Timestamp</span>
                                    <span className="text-slate-700">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                                </div>
                            </div>

                            {selectedLog.changedColumns && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Changed Columns</h4>
                                    <div className="bg-amber-50 text-amber-800 px-3 py-2 border border-amber-200 rounded-lg font-mono text-xs font-semibold">
                                        {selectedLog.changedColumns}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Old Data Block</h4>
                                    <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border max-h-[250px] overflow-y-auto shadow-inner">
                                        {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : "NULL / NO PREVIOUS DATA"}
                                    </pre>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">New Data Block</h4>
                                    <pre className="bg-slate-900 text-sky-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border max-h-[250px] overflow-y-auto shadow-inner">
                                        {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : "NULL / NO NEW DATA"}
                                    </pre>
                                </div>
                            </div>

                            {selectedLog.userAgent && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">User Agent (Browser Metadata)</h4>
                                    <div className="bg-slate-50 text-slate-600 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono break-all leading-relaxed">
                                        {selectedLog.userAgent}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* 🔥 LOGIN SESSIONS EXTENDED METADATA DIALOG MODAL */}
            <Dialog open={isSessionModalOpen} onOpenChange={setIsSessionModalOpen}>
                <DialogContent className="sm:max-w-[550px] bg-white rounded-xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-800 border-b pb-3">
                            Session Extended Metadata
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-4 pt-2 text-sm">
                            <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2 items-center">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Session ID:</span>
                                <span className="col-span-2 font-mono text-xs text-indigo-700 bg-indigo-50/50 border border-indigo-100 p-1.5 rounded-md break-all font-semibold">
                                    {selectedSession.id}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2 items-center">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">User UUID:</span>
                                <span className="col-span-2 font-mono text-xs text-slate-600 break-all bg-slate-50 p-1 rounded">
                                    {selectedSession.userId || "N/A"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2 items-center">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Username:</span>
                                <span className="col-span-2 font-bold text-slate-800">
                                    {selectedSession.username || "System"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2 items-center">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Client IP:</span>
                                <span className="col-span-2 font-mono text-cyan-700 font-semibold">
                                    {selectedSession.ipAddress || "-"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2 items-start">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider mt-1">User Agent:</span>
                                <span className="col-span-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 border border-slate-100 rounded-md max-h-[100px] overflow-y-auto font-mono">
                                    {selectedSession.userAgent || "-"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2 items-center">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Session Expire:</span>
                                <span className="col-span-2 text-slate-600 font-medium">
                                    {selectedSession.expire ? new Date(selectedSession.expire).toLocaleString() : "-"}
                                </span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}