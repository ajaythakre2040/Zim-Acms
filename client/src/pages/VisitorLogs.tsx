import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Download } from "lucide-react";

export default function VisitorLogs() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ["/api/visitor_card_logs"],
        queryFn: () => fetch("/api/visitor_card_logs").then((res) => res.json()),
    });

    return (
        <Card className="m-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Visitor Access Logs</CardTitle>
                <div className="space-x-2">
                    <Button variant="outline"><Eye className="mr-2 h-4 w-4" /> View Details</Button>
                    <Button variant="default"><Download className="mr-2 h-4 w-4" /> Export</Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="p-4">Loading logs...</p>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4">Visitor Code</th>
                                    <th className="p-4">Device ID</th>
                                    <th className="p-4">Command</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Log Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs?.map((log: any) => (
                                    <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-4 font-medium">{log.visitorCardCode}</td>
                                        <td className="p-4">{log.deviceId}</td>
                                        <td className="p-4">{log.command}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="p-4">{new Date(log.syncDate).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}