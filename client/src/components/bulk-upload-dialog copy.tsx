import { useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    type: 'details' | 'doors';
}

export function BulkUploadDialog({ open, onClose, type }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errorFile, setErrorFile] = useState<string | null>(null);
    const { toast } = useToast();

    const fileName = type === 'details' ? 'emplyee_template.csv' : 'asign_doors_template.csv';

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setErrorFile(null); // Reset previous errors

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: ParseResult<any>) => {
                const endpoint = type === 'details' ? '/api/people/bulk-update' : '/api/doors/bulk-assign';

                try {
                    const res = await apiRequest("POST", endpoint, { data: results.data });
                    const result = await res.json();

                    if (result.errorFile) {
                        setErrorFile(result.errorFile);
                        toast({ title: "Upload completed with warnings", variant: "destructive" });
                    } else {
                        toast({ title: "Success", description: "Bulk upload successful!" });
                        onClose();
                    }
                } catch (err) {
                    toast({ title: "Error", description: "Failed to process file.", variant: "destructive" });
                } finally {
                    setIsUploading(false);
                }
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bulk Upload: {type === 'details' ? 'Employee Records' : 'Door Assignments'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Template Download */}
                    <a href={`/templates/${fileName}`} download className="text-blue-600 hover:text-blue-800 underline text-sm font-medium flex items-center gap-2">
                        <FileDown className="w-4 h-4" /> Download Sample Template
                    </a>

                    {/* File Upload Zone */}
                    {!errorFile && (
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50">
                            <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                        </div>
                    )}

                    {/* Error Handling UI inside Modal */}
                    {errorFile && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                            <p className="text-sm text-red-800 font-semibold mb-3">Some records failed to import.</p>

                            <div className="flex flex-col gap-2">
                                <a href={`/api/download/${errorFile}`} target="_blank" rel="noreferrer">
                                    <Button variant="destructive" className="w-full">
                                        <FileDown className="w-4 h-4 mr-2" /> Download Error Log
                                    </Button>
                                </a>

                                {/* YEH NAYA BUTTON HAI JO SCREEN RESET KAREGA */}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setErrorFile(null);
                                        setFile(null); // File selection bhi clear kar dein
                                    }}
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {isUploading && (
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-2 animate-pulse w-full"></div>
                        </div>
                    )}

                    {/* Action Button */}
                    {!errorFile && (
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleUpload} disabled={!file || isUploading}>
                            {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Start Upload"}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}