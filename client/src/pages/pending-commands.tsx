import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { useLocation } from "wouter";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  Search,
  FilterX,
  Check,
  ChevronsUpDown,
  ArrowLeft,
} from "lucide-react";
import { PaginationSize } from "@/components/ui/pagination";

// Helper function to capitalize employee name
const capitalizeFirst = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

export default function PendingCommandsPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [doorId, setDoorId] = useState<string>("all");
  const [employeeCode, setEmployeeCode] = useState<string>("");
  const [commandType, setCommandType] = useState<string>("all");
  
  // Popover open state for Employee Filter
  const [openEmpPopover, setOpenEmpPopover] = useState(false);

  const [pagedResponse, setPagedResponse] = useState<any>(null);

  const { data: doors } = useCrud<any>("/api/doors", "Doors");
  const { data: employees } = useCrud<any>("/api/people", "Employees");

  const { isLoading } = useCrud<any>(
    `/api/doors/pending-commands-count?page=${page}&pageSize=${pageSize}`,
    "PendingCommands"
  );

  const fetchPendingCommands = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: searchTerm,
      });

      if (doorId && doorId !== "all") queryParams.append("doorId", doorId);
      if (employeeCode) queryParams.append("employeeCode", employeeCode);
      if (commandType && commandType !== "all")
        queryParams.append("actionType", commandType);

      const res = await fetch(
        `/api/doors/pending-commands-count?${queryParams.toString()}`
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
  }, [page, searchTerm, pageSize, doorId, employeeCode, commandType]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setDoorId("all");
    setEmployeeCode("");
    setCommandType("all");
    setPage(1);
  };

  const data = pagedResponse?.data || [];
  const totalPages = pagedResponse?.totalPages || 1;
  const totalCount = pagedResponse?.totalCount || 0;

  const people = employees || [];

  const columns = [
    {
      key: "commandId",
      label: "Command ID",
      render: (item: any) => (
        <span className="font-medium">{item.commandId || "-"}</span>
      ),
    },
    {
      key: "actionType",
      label: "Action Type",
      render: (item: any) => (
        <Badge variant="outline" className="capitalize">
          {item.actionType || "-"}
        </Badge>
      ),
    },
    {
      key: "employee",
      label: "Employee",
      render: (item: any) => (
        <span className="text-muted-foreground font-medium">
          {item.employeeName
            ? `${capitalizeFirst(item.employeeName)} (${item.employeeCode})`
            : item.employeeCode || "-"}
        </span>
      ),
    },
    {
      key: "doorDevice",
      label: "Door / Device",
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.doorName || "-"}</span>
          <span className="text-xs text-muted-foreground">
            {item.deviceName || `Device ID: ${item.deviceId}`}
          </span>
        </div>
      ),
    },
    {
  key: "creationDate",
  label: "Created At",
  render: (item: any) => {
    if (!item.creationDate) return "-";
    
    // Agar Backend UTC offset 'Z' add kar raha hai toh usko strip (remove) kar dein
    const cleanDateStr = typeof item.creationDate === 'string' 
      ? item.creationDate.replace(/Z$/i, '') 
      : item.creationDate;

    return (
      <span className="text-muted-foreground">
        {new Date(cleanDateStr).toLocaleString()}
      </span>
    );
  },
}
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* HEADER */}
      <div className="flex items-center gap-3">
  <Button
  variant="outline"
  size="sm"
  className="h-9 px-3 gap-2 shrink-0"
  onClick={() => setLocation("/doors")}
>
  <ArrowLeft className="h-4 w-4" />
  Back
</Button>
  <div>
    <h1 className="text-2xl font-black tracking-tight text-slate-800">
      Pending Commands
    </h1>
    <p className="text-sm text-slate-500 font-medium">
      Manage and view pending commands
    </p>
  </div>
</div>

      {/* FILTERS & SEARCH SECTION */}
      <div className="flex flex-wrap items-end gap-3 bg-muted/10 p-3 rounded-lg border">

        {/* Door Filter */}
        <div className="w-full sm:w-44">
          <Select
            value={doorId}
            onValueChange={(val) => {
              setDoorId(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select Door" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doors</SelectItem>
              {doors?.map((door: any) => (
                <SelectItem key={door.id} value={door.id.toString()}>
                  {door.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Searchable Employee Combobox */}
        <div className="w-full sm:w-56">
          <Popover open={openEmpPopover} onOpenChange={setOpenEmpPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openEmpPopover}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                style={{ borderColor: "hsl(var(--input))" }}
              >
                <span className="truncate">
                  {employeeCode
                    ? (() => {
                        const selected = people.find(
                          (p: any) =>
                            String(p.code || p.employeeCode) ===
                            String(employeeCode)
                        );
                        return selected
                          ? `${capitalizeFirst(
                              selected.name || selected.employeeName || ""
                            )} (${selected.code || selected.employeeCode})`
                          : "Select Employee...";
                      })()
                    : "All Employees"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput
                  placeholder="Search employee..."
                  className="text-xs h-9"
                />
                <CommandList>
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-employees"
                      onSelect={() => {
                        setEmployeeCode("");
                        setPage(1);
                        setOpenEmpPopover(false);
                      }}
                      className="text-xs"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          !employeeCode ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      All Employees
                    </CommandItem>

                    {people.map((p: any) => {
                      const empCode = String(p.code || p.employeeCode || "");
                      const empName = capitalizeFirst(
                        p.name || p.employeeName || ""
                      );
                      const displayText = `${empName} (${empCode})`;
                      const isSelected =
                        String(employeeCode) === empCode;

                      return (
                        <CommandItem
                          key={p.id || empCode}
                          value={`${empName} ${empCode}`}
                          onSelect={() => {
                            setEmployeeCode(isSelected ? "" : empCode);
                            setPage(1);
                            setOpenEmpPopover(false);
                          }}
                          className="text-xs"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              isSelected ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {displayText}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Command Type Filter */}
        <div className="w-full sm:w-40">
          <Select
            value={commandType}
            onValueChange={(val) => {
              setCommandType(val);
              setPage(1);
            }}
          >

          </Select>
        </div>
       
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
        {/* LEFT */}
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
          <span className="font-semibold text-foreground">{totalCount}</span>{" "}
          commands
        </div>

        {/* RIGHT */}
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
                if (val >= 1 && val <= totalPages) {
                  setPage(val);
                }
              }}
              className="w-12 h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all"
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