import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  Activity,
  Monitor,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationSize } from "@/components/ui/pagination";

import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";
import {
  exportMachineLogsCSV,
  exportMachineLogsPDF,
  formatDateTime,
} from "@/lib/utils";

export default function LiveVisitorLogsDashboard() {
  const { canExport, canView } = usePermission(MENU_CONFIG.LIVE_LOGS.code);
  const [, setLocation] = useLocation();

  // 1. Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const REFRESH_MS = 2000;

  // React Query with dynamic parameters
  const { data: queryResponse, isLoading } = useQuery({
    queryKey: ["/api/dashboard/attendance/machine-logs", page, pageSize],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/attendance/machine-logs?page=${page}&pageSize=${pageSize}`
      );
      return await res.json();
    },
    refetchInterval: REFRESH_MS,
    enabled: !!canView, // Dynamic query triggers only if user can view
  });

  if (!canView) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to view reports.
        </p>
      </div>
    );
  }

  // Smart Parsing: Raw data fallback extraction
  const rawLogs = Array.isArray(queryResponse)
    ? queryResponse
    : queryResponse?.machineFeed || queryResponse?.data || [];

  // 🌟 FIX: Client-Side Guard
  // Agar backend pageSize handle nahi kar rha aur saare records bhej rha h, 
  // toh hum khud unhe slice (filter) kar denge standard pagination layout me.
  const displayLogs = rawLogs.length > pageSize && !queryResponse?.totalPages
    ? rawLogs.slice((page - 1) * pageSize, page * pageSize)
    : rawLogs;

  const totalCount = queryResponse?.totalCount || rawLogs.length || 0;
  const totalPages =
    queryResponse?.totalPages || Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto [&_td]:py-2 [&_th]:py-2">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg text-white">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Visitor Access Logs
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time machine interaction and security events.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-border">
        <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-500" />
            Live Machine Feed
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* <button
              onClick={() => setLocation("/reports?tab=access-logs")}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </button> */}

            {/* {canExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="text-xs px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportMachineLogsCSV(rawLogs)}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportMachineLogsPDF(rawLogs)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )} */}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/90 border-b sticky top-0 z-10 backdrop-blur-sm text-center">
                <tr>
                  <th className="px-4 py-3 font-semibold text-left">
                    Visitor Name
                  </th>
                  <th className="px-4 py-3 font-semibold">Visitor Code</th>
                  <th className="px-4 py-3 font-semibold">Door Name</th>
                  <th className="px-4 py-3 font-semibold">Device Name</th>
                  <th className="px-4 py-3 font-semibold">Direction</th>
                  <th className="px-4 py-3 font-semibold">Log Date</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="p-2">
                          <Skeleton className="h-12 w-full" />
                        </td>
                      </tr>
                    ))
                  : displayLogs.map((log: any, i: number) => (
                      <tr
                        key={i}
                        className="hover:bg-muted/30 text-center transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-left">
                          {log.employeeName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {log.employeeCode}
                        </td>
                        <td className="px-4 py-3">{log.doorName}</td>
                        <td className="px-4 py-3">{log.deviceName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.direction === "IN"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {log.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {log.logDate ? formatDateTime(log.logDate) : "-"}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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
              of{" "}
              <span className="font-semibold text-foreground">
                {totalCount}
              </span>{" "}
              logs
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
        </CardContent>
      </Card>
    </div>
  );
}
