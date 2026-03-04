import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchable?: boolean;
  searchKeys?: string[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  searchable,
  searchKeys = [],
  onRowClick,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search || !searchKeys.length) return data;
    const q = search.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((k) => String(item[k] || "").toLowerCase().includes(q))
    );
  }, [data, search, searchKeys]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-table-search"
          />
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.className || ""} ${col.hideOnMobile ? "hidden md:table-cell" : ""}`}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, idx) => (
                <TableRow
                  key={item.id || idx}
                  className={onRowClick ? "cursor-pointer hover-elevate" : ""}
                  onClick={() => onRowClick?.(item)}
                  data-testid={`row-item-${item.id || idx}`}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${col.className || ""} ${col.hideOnMobile ? "hidden md:table-cell" : ""}`}
                    >
                      {col.render ? col.render(item) : String(item[col.key] ?? "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
