import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  Search,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";
import { PaginationSize } from "@/components/ui/pagination";

export default function PendingCommandsPage() {
//   const { canView } = usePermission(
//     MENU_CONFIG.PENDING_COMMANDS?.code || ""
//   );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagedResponse, setPagedResponse] = useState<any>(null);

  const { isLoading } = useCrud<any>(
    `/api/pending-commands?page=${page}&pageSize=${pageSize}`,
    "PendingCommands"
  );

  const fetchPendingCommands = async () => {
    try {
      const res = await fetch(
        `/api/pending-commands?page=${page}&pageSize=${pageSize}&search=${searchTerm}`
      );
      const data = await res.json();
      setPagedResponse(data);
    } catch (err) {
      console.error("Error fetching pending commands:", err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPendingCommands();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm, pageSize]);

//   if (!canView) {
//     return (
//       <div className="p-6 text-center text-muted-foreground">
//         You do not have permission to view this page.
//       </div>
//     );
//   }

  const data = pagedResponse?.data || [];
  const totalPages = pagedResponse?.totalPages || 1;

  const columns = [
    {
      key: "command",
      label: "Command",
      render: (item: any) => <span className="font-medium">{item.command}</span>,
    },
    {
      key: "device",
      label: "Device",
      render: (item: any) => (
        <span className="text-muted-foreground">{item.deviceName || item.deviceId || "-"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => (
        <Badge variant={item.status === "PENDING" ? "secondary" : "default"}>
          {item.status || "Pending"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (item: any) => (
        <span className="text-muted-foreground">
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          Pending Commands
        </h1>
        <p className="text-sm text-slate-500 font-medium">Manage and view pending commands</p>
      </div>

      {/* SEARCH INPUT */}
      <div className="relative max-w-sm my-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search commands..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable={false}
        pageSize={pageSize}
        emptyMessage="No pending commands found"
      />

      {/* PAGINATION */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/20 mt-2 rounded-b-lg">
        {/* LEFT: Showing X to Y of Z */}
        <div className="text-sm text-muted-foreground order-2 md:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {pagedResponse?.totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">
            {Math.min(page * pageSize, pagedResponse?.totalCount || 0)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {pagedResponse?.totalCount || 0}
          </span>{" "}
          commands
        </div>

        {/* RIGHT: Pagination Controls */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 order-1 md:order-2">
          {/* Page Size & Direct Jump */}
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
                if (val >= 1 && val <= totalPages) {
                  setPage(val);
                }
              }}
              className="w-12 h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          {/* Buttons Navigation */}
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
              disabled={page === totalPages || totalPages === 0}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 0}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}