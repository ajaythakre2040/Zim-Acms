import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Monitor } from "lucide-react";

export default function LiveLogsDashboard() {
  const REFRESH_MS = 2000;

  const { data = [], isLoading } = useQuery({
    queryKey: ["/api/dashboard/attendance/machine-logs"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/attendance/machine-logs");
      const json = await res.json();
      return json.machineFeed || [];
    },
    refetchInterval: REFRESH_MS,
  });
  const exportToCSV = () => {
    if (!data.length) return;

    const headers = [
      "Employee Name",
      "Employee Code",
      "Door Name",
      "Device Name",
      "Direction",
      "Log Date",
    ];

    const rows = data.map((log: any) => {
      // 1. Date ko ISO format me convert karo (e.g. 2026-04-22T11:02:21.000Z)
      // 2. T ko space se replace karo aur milliseconds hata do
      const dateObj = new Date(log.logDate);
      const cleanDate = dateObj.toISOString().replace("T", " ").split(".")[0];

      return [
        log.employeeName,
        log.employeeCode,
        log.doorName,
        log.deviceName,
        log.direction,
        cleanDate, // Ab yahan koi comma nahi hai (e.g. 2026-04-22 11:02:21)
      ];
    });

    // Safe approach: Saare fields ko double quotes me wrap kar do taaki data me kahi bhi comma ho to problem na ho
    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "machine_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg text-white">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Device Access Logs
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time machine interaction and security events.
          </p>
        </div>
      </div>

      {/* Table */}

      <Card className="border-none shadow-sm ring-1 ring-border">
        {/* ✅ SINGLE HEADER (Title + Button dono yahi) */}
        <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-500" />
            Live Machine Feed
          </CardTitle>

          <button
            onClick={exportToCSV}
            className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            Export CSV
          </button>
        </CardHeader>

        {/* Table */}
        <CardContent className="p-0"></CardContent>
        <CardContent className="p-0">
  <div className="overflow-x-auto overflow-y-auto max-h-[500px]"> {/* <-- Yahan height fix ki hai */}
    <table className="w-full text-sm sticky-header"> {/* Header ko sticky banane ke liye class (optional) */}
      <thead className="bg-muted/90 border-b sticky top-0 z-10 backdrop-blur-sm"> {/* <-- Header ko top par chipka diya */}
        <tr>
          <th className="px-4 py-3 text-center">Employee Name</th>
          <th className="px-4 py-3 text-center">Employee Code</th>
          <th className="px-4 py-3 text-center">Door Name</th>
          <th className="px-4 py-3 text-center">Device Name</th>
          <th className="px-4 py-3 text-center">Direction</th>
          <th className="px-4 py-3 text-center">Log Date</th>
        </tr>
      </thead>

              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-4">
                      <Skeleton className="h-20 w-full" />
                    </td>
                  </tr>
                ) : (
                  data.map((log: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/5 text-center">
                      <td className="px-4 py-3">{log.employeeName}</td>
                      <td className="px-4 py-3">{log.employeeCode}</td>
                      <td className="px-4 py-3">{log.doorName}</td>
                      <td className="px-4 py-3">{log.deviceName}</td>
                      <td className="px-4 py-3">{log.direction}</td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {/* Local conversion ki jagah direct format handle karo */}
                        {log.logDate.replace("T", " ").split(".")[0]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
