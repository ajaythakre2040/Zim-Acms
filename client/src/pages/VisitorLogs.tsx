import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  Download, 
  FileSpreadsheet, 
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportVisitorLogsCSV, exportVisitorLogsPDF } from "@/lib/utils";
import { useState } from "react";
import { PaginationSize } from "@/components/ui/pagination";

export default function VisitorLogs() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");

    // 🚀 Purana simple fetch return kar rahe hain kyunki backend seedhe array de raha hai
    const { data: rawLogs = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/visitor_card_logs"],
        queryFn: () => fetch("/api/visitor_card_logs").then((res) => res.json()),
    });

    // 1. Client-side par Search filter apply karein
    const filteredLogs = rawLogs.filter((log) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            log.visitorCardCode?.toLowerCase().includes(searchLower) ||
            log.command?.toLowerCase().includes(searchLower) ||
            log.status?.toLowerCase().includes(searchLower) ||
            log.deviceId?.toString().includes(searchLower)
        );
    });

    // 2. Client-side par exact Pagination mathematics nikalein
    const totalCount = filteredLogs.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    
    // Exact page constraints setup
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Slice data for current page display
    const logsData = filteredLogs.slice(startIndex, endIndex);

    return (
        <Card className="m-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Visitor Access Logs</CardTitle>
                <div className="space-x-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                className="text-xs px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                                disabled={isLoading || !filteredLogs.length}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            {/* CSV Options - Saare filtered logs export honge */}
                            <DropdownMenuItem onClick={() => exportVisitorLogsCSV(filteredLogs)}>
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                                Export CSV
                            </DropdownMenuItem>

                            {/* PDF Options */}
                            <DropdownMenuItem onClick={() => exportVisitorLogsPDF(filteredLogs)}>
                                <FileText className="w-4 h-4 mr-2 text-red-500" />
                                Export PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative max-w-sm mb-4">
                    <input
                        placeholder="Search visitor logs..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1); // Naye search par hamesha page 1 par bhejega
                        }}
                        className="w-full h-9 border rounded-md pl-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                {isLoading ? (
                    <p className="p-4 text-sm">Loading logs...</p>
                ) : (
                    <>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm text-muted-foreground">
                                <thead className="bg-gray-50 border-b text-foreground font-medium">
                                    <tr>
                                        <th className="py-2.5 px-4 font-semibold text-foreground">Visitor Code</th>
                                        <th className="py-2.5 px-4 font-semibold text-foreground">Device ID</th>
                                        <th className="py-2.5 px-4 font-semibold text-foreground">Command</th>
                                        <th className="py-2.5 px-4 font-semibold text-foreground">Status</th>
                                        <th className="py-2.5 px-4 font-semibold text-foreground">Log Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsData.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                                                No logs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        logsData.map((log: any) => (
                                            <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 text-foreground/90">
                                                <td className="py-2.5 px-4 font-medium text-foreground">{log.visitorCardCode}</td>
                                                <td className="py-2.5 px-4">{log.deviceId}</td>
                                                <td className="py-2.5 px-4">{log.command}</td>
                                                <td className="py-2.5 px-4">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4">{new Date(log.syncDate).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
                            {/* Stats */}
                            <div className="text-sm text-muted-foreground order-2 md:order-1">
                                Showing{" "}
                                <span className="font-semibold text-foreground">
                                    {totalCount === 0 ? 0 : startIndex + 1}
                                </span>{" "}
                                to{" "}
                                <span className="font-semibold text-foreground">
                                    {Math.min(endIndex, totalCount)}
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-foreground">
                                    {totalCount}
                                </span>{" "}
                                visitor logs
                            </div>

                            {/* Controls */}
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
                                        value={currentPage}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (val >= 1 && val <= totalPages) setPage(val);
                                        }}
                                        className="w-12 h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex items-center space-x-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={currentPage === 1}>
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium gap-1" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </Button>
                                    <div className="flex items-center justify-center min-w-[80px] h-8 bg-background border rounded-md text-xs font-bold shadow-sm px-2">
                                        {currentPage} / {totalPages}
                                    </div>
                                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium gap-1" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                        Next <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}