import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DoorOpen, Sparkles, Wifi, WifiOff, Server, UserCheck,FileText, FileSpreadsheet } from "lucide-react";
import type { Device, Door } from "@shared/schema";
import { navigate } from "wouter/use-browser-location";
import { usePermission } from "@/hooks/use-permission";
import { MENU_CONFIG } from "../../../server/constant";
import { Button } from "@/components/ui/button";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportDoorAttendanceCSV, exportDoorAttendancePDF } from "@/lib/utils";
export default function Dashboard() {
  const { canExport } = usePermission(MENU_CONFIG.ATTENDANCE_SUMMARY.code);
  const REFRESH_MS = 5000;
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);

  React.useEffect(() => {
    const handler = (e: any) => setSelectedDate(e.detail);
    window.addEventListener("dateChange", handler);
    return () => window.removeEventListener("dateChange", handler);
  }, []);

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?date=${selectedDate}`);
      return res.json();
    },
    refetchInterval: REFRESH_MS,
  });

  const { data: doorData } = useQuery<any>({
    queryKey: ["/api/dashboard/attendance/door-wise-stats", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/attendance/door-wise-stats?date=${selectedDate}`);
      return res.json();
    },
    refetchInterval: REFRESH_MS,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: REFRESH_MS,
  });

  const { data: doors = [] } = useQuery<Door[]>({
    queryKey: ["/api/doors"],
    refetchInterval: REFRESH_MS,
  });

  // 🔥 Gradient Cards
  const statCards = [
    { title: "Total Employees", value: stats?.totalPeople || 0, icon: Users, route: "/employees", bg: "bg-gradient-to-r from-blue-500 to-blue-700" },
    { title: "Total Shifts", value: stats?.totalshift || 0, icon: UserCheck, route: "/shifts", bg: "bg-gradient-to-r from-emerald-500 to-emerald-700" },
    { title: "Total Doors", value: doors.length, icon: DoorOpen, route: "/doors", bg: "bg-gradient-to-r from-orange-500 to-orange-700" },
    { title: "Total Devices", value: devices.length, icon: Server, route: "/devices", bg: "bg-gradient-to-r from-violet-500 to-violet-700" },
    { title: "Online", value: devices.filter(d => d.status === "online").length, icon: Wifi, route: "/devices", bg: "bg-gradient-to-r from-cyan-500 to-cyan-700" },
    { title: "Offline", value: devices.filter(d => d.status === "offline").length, icon: WifiOff, route: "/devices", bg: "bg-gradient-to-r from-slate-500 to-slate-700" },
  ];

  const extraCards = [
    { title: "Main Gate IN", value: doorData?.mainGateIn || 0, bg: "bg-gradient-to-r from-blue-500 to-indigo-600" },
    // {
    //   title: "Main Gate IN",
    //   // Chote font size aur spans ka use karke inline style maintain rakhna
    //   value: (
    //     <span className="whitespace-nowrap text-2xl md:text-3xl">
    //       {doorData?.mainGateIn || 0}
    //       <span className="text-sm font-normal ml-1 opacity-90 bg-black/20 px-1.5 py-0.5 rounded">
    //         ({doorData?.yesterdayInBalance || 0} Night)
    //       </span>
    //     </span>
    //   ),
    //   bg: "bg-gradient-to-r from-blue-500 to-indigo-600"
    // },
    { title: "Main Gate OUT", value: doorData?.mainGateOut || 0, bg: "bg-gradient-to-r from-orange-500 to-red-500" },
    { title: "Balance", value: doorData?.mainGateBal || 0, bg: "bg-gradient-to-r from-slate-500 to-gray-700" },
    { title: "Absent", value: doorData?.totalAbsent || 0, bg: "bg-gradient-to-r from-red-500 to-pink-600" },
    { title: "Present", value: doorData?.totalPresent || 0, bg: "bg-gradient-to-r from-emerald-500 to-green-700" },
    { title: "Total Employees", value: doorData?.totalManpower || 0, bg: "bg-gradient-to-r from-violet-500 to-purple-700" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-white min-h-screen">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg text-white">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Attendance Summary</h1>
          <p className="text-xs text-muted-foreground">Real-time status</p>
        </div>
      </div>

      {/* 🔥 Gradient Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <Card
            key={i}
            onClick={() => navigate(card.route)}
            className={`${card.bg} text-white border-none cursor-pointer transition-all hover:scale-[1.05] hover:shadow-2xl relative overflow-hidden`}
          >
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition blur-xl"></div>

            <CardContent className="p-4 space-y-3 relative z-10">
              <card.icon className="w-6 h-6 opacity-90" />
              <div>
                <p className="text-3xl font-extrabold">{card.value}</p>
                <p className="text-[10px] uppercase opacity-80">{card.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 🔥 Gradient Extra Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {extraCards.map((card, i) => (
          <Card
            key={i}
            className={`${card.bg} text-white border-none shadow-lg hover:scale-[1.05] transition relative overflow-hidden`}
          >
            {/* Shine */}
            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition blur-xl"></div>

            <CardContent className="p-4">
              <p className="text-3xl font-extrabold">{card.value}</p>
              <p className="text-[10px] uppercase opacity-80">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <DoorAttendanceTable selectedDate={selectedDate} apiResponse={doorData} canExport={canExport} />
    </div>
  );
}

export function DoorAttendanceTable({
  selectedDate,
  apiResponse,
  canExport,
}: {
  selectedDate: string;
  apiResponse: any;
  canExport: boolean; // Type define karein
}) {

  // 🔹 CSV Export Logic
  const exportToCSV = () => {
    if (!doorStats.length) return;

    // Headers: Direction, Door1, Door2...
    const headers = ["Direction", ...doorStats.map((d: any) => d.doorName)];

    // Rows prepare karna
    const rows = [
      ["IN", ...doorStats.map((d: any) => d.inCount)],
      ["OUT", ...doorStats.map((d: any) => d.outCount)],
      ["BAL", ...doorStats.map((d: any) => d.balance)],
    ];

    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `door_attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!apiResponse) return <Skeleton className="h-48 w-full" />;
  const doorStats = apiResponse?.doorStats || [];

  return (
    <Card className="border-none shadow-md bg-white ring-1 ring-gray-200">
      <CardHeader className="pb-3 border-b bg-gray-50 flex flex-row justify-between items-center">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          Door-wise Attendance
        </CardTitle>

        {/* Right Side Actions (Date + Export) */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              window.dispatchEvent(new CustomEvent("dateChange", { detail: e.target.value }))
            }
            className="border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400"
          />
          {canExport && (
          <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      size="sm"
      className="text-xs px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
    >
      Export
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent align="end">

    {/* CSV */}
    <DropdownMenuItem onClick={() => exportDoorAttendanceCSV(doorStats, selectedDate)}>
      <FileSpreadsheet className="w-4 h-4 mr-2" />
      Export CSV
    </DropdownMenuItem>

    {/* PDF */}
    <DropdownMenuItem onClick={() => exportDoorAttendancePDF(doorStats, selectedDate)}>
      <FileText className="w-4 h-4 mr-2" />
      Export PDF
    </DropdownMenuItem>

  </DropdownMenuContent>
</DropdownMenu>
          )}

        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {/* border-collapse add kiya taaki lines clean dikhein agar aapne border-l lagaya ho */}
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3 text-left">Direction</th>
                {doorStats.map((d: any) => (
                  <th key={d.doorName} className="text-center border-l border-gray-200 px-4 py-3">
                    {d.doorName}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-bold text-blue-600">IN</td>
                {doorStats.map((d: any) => (
                  <td key={d.doorName} className="text-center border-l border-gray-200 px-4 py-3">{d.inCount}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-bold text-orange-500">OUT</td>
                {doorStats.map((d: any) => (
                  <td key={d.doorName} className="text-center border-l border-gray-200 px-4 py-3">{d.outCount}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-700">BAL</td>
                {doorStats.map((d: any) => (
                  <td key={d.doorName} className="text-center font-bold border-l border-gray-200 px-4 py-3">{d.balance}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}