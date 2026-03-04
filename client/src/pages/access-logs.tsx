import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { AccessLog, Person, Device, Door } from "@shared/schema";

const eventColors: Record<string, string> = {
  entry: "default",
  exit: "secondary",
  denied: "destructive",
  tailgate: "destructive",
  forced: "destructive",
};

const methodLabels: Record<string, string> = {
  card: "Card",
  face: "Face",
  fingerprint: "Fingerprint",
  qr: "QR",
  pin: "PIN",
  manual: "Manual",
};

export default function AccessLogsPage() {
  const { data: logs = [], isLoading } = useQuery<AccessLog[]>({
    queryKey: ["/api/access-logs"],
  });
  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/people"] });
  const { data: devices = [] } = useQuery<Device[]>({ queryKey: ["/api/devices"] });
  const { data: doors = [] } = useQuery<Door[]>({ queryKey: ["/api/doors"] });

  const columns = [
    {
      key: "timestamp", label: "Time",
      render: (l: AccessLog) => l.timestamp ? (
        <div>
          <p className="text-sm">{new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-xs text-muted-foreground">{new Date(l.timestamp).toLocaleDateString()}</p>
        </div>
      ) : "-",
    },
    {
      key: "person", label: "Person",
      render: (l: AccessLog) => {
        const p = people.find((x) => x.id === l.personId);
        return p ? `${p.firstName} ${p.lastName || ""}` : l.personId ? `#${l.personId}` : "-";
      },
    },
    {
      key: "eventType", label: "Event",
      render: (l: AccessLog) => <Badge variant={eventColors[l.eventType || ""] as any}>{l.eventType}</Badge>,
    },
    {
      key: "accessMethod", label: "Method", hideOnMobile: true,
      render: (l: AccessLog) => methodLabels[l.accessMethod || ""] || l.accessMethod || "-",
    },
    {
      key: "door", label: "Door", hideOnMobile: true,
      render: (l: AccessLog) => doors.find((d) => d.id === l.doorId)?.name || "-",
    },
    {
      key: "device", label: "Device", hideOnMobile: true,
      render: (l: AccessLog) => devices.find((d) => d.id === l.deviceId)?.name || "-",
    },
    {
      key: "isAuthorized", label: "Auth",
      render: (l: AccessLog) => l.isAuthorized ? <Badge variant="secondary">Allowed</Badge> : <Badge variant="destructive">Denied</Badge>,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Access Logs" description="View all access events across the system" />
      <DataTable columns={columns} data={logs} isLoading={isLoading} searchable searchKeys={["eventType", "accessMethod"]} emptyMessage="No access logs recorded" />
    </div>
  );
}
