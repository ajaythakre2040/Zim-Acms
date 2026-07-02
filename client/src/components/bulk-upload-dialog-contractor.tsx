import { useState, useEffect } from "react";
import Papa, { ParseResult } from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileDown, UploadCloud, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function BulkUploadDialog({ open, onClose }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [files, setFiles] = useState<{ success?: string, error?: string } | null>(null);
    const { toast } = useToast();

    // Dedicated template filename for contractors
    const fileName = 'contractor_template.csv';

    // Jab bhi modal band ho, saari states reset ho jayein
    useEffect(() => {
        if (!open) {
            resetDialog();
        }
    }, [open]);

    // const handleUpload = async () => {
    //     if (!file) return;
    //     setIsUploading(true);
    //     setFiles(null);

    //     Papa.parse(file, {
    //         header: true,
    //         skipEmptyLines: true,
    //         complete: async (results: ParseResult<any>) => {
    //             // Contractor API endpoint
    //             const endpoint = '/api/contractors/bulk-upload';

    //             try {
    //                 const res = await apiRequest("POST", endpoint, { data: results.data });
    //                 const result = await res.json();

    //                 if (result.files) {
    //                     setFiles(result.files);
    //                     toast({
    //                         title: result.files.error ? "Upload completed with warnings" : "Success",
    //                         description: result.files.error ? "Some contractor records failed." : "Contractors bulk upload successful!",
    //                         variant: result.files.error ? "destructive" : "default"
    //                     });
    //                 } else {
    //                     toast({ title: "Success", description: "Contractors bulk upload successful!" });
    //                     onClose();
    //                 }
    //             } catch (err) {
    //                 toast({ title: "Error", description: "Failed to process contractor file.", variant: "destructive" });
    //             } finally {
    //                 setIsUploading(false);
    //             }
    //         }
    //     });
    // };


    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setFiles(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: ParseResult<any>) => {
                // Contractor endpoint
                const endpoint = '/api/contractors/bulk-upload';
                try {
                    const res = await apiRequest("POST", endpoint, { data: results.data });

                    // Agar status 400 hai (validation error), to error handle karein
                    if (!res.ok) {
                        const errData = await res.json();
                        toast({
                            title: "Upload Failed",
                            description: errData.error || "Header mismatch",
                            variant: "destructive"
                        });
                        return; // Yahan ruk jayega
                    }

                    const result = await res.json();

                    if (result.files) {
                        setFiles(result.files);
                        toast({
                            title: result.files.error ? "Partial success" : "Success",
                            description: result.files.error ? "Some records failed." : "Bulk upload successful!",
                            variant: result.files.error ? "destructive" : "default"
                        });
                    } else {
                        toast({ title: "Success", description: "Bulk upload successful!" });
                        onClose();
                    }
                } catch (err: any) {
                    toast({
                        title: "Upload Failed",
                        description: err.message,
                        variant: "destructive"
                    });
                } finally {
                    setIsUploading(false);
                }
            }
        });
    };
    const resetDialog = () => {
        setFiles(null);
        setFile(null);
        setIsUploading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bulk Upload: Contractor Records</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {!files && !isUploading && (
                        /* Fixed Download Attribute for forced CSV file downloading */
                        <a 
                            href={`/templates/${fileName}`} 
                            download={fileName} 
                            className="text-blue-600 hover:text-blue-800 underline text-sm font-medium flex items-center gap-2 w-fit"
                        >
                            <FileDown className="w-4 h-4" /> Download Contractor Template
                        </a>
                    )}

                    {!files && !isUploading && (
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

                    {files && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
                            <p className="text-sm font-semibold text-slate-700 mb-2">Upload Result:</p>

                            {files.success && (
                                <a href={`/api/download/${files.success}`} download target="_blank" rel="noreferrer">
                                    <Button variant="outline" className="w-full text-green-700 border-green-200 hover:bg-green-50">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Download Success Log
                                    </Button>
                                </a>
                            )}

                            {files.error && (
                                <a href={`/api/download/${files.error}`} download target="_blank" rel="noreferrer">
                                    <Button variant="destructive" className="w-full">
                                        <AlertCircle className="w-4 h-4 mr-2" /> Download Error Log
                                    </Button>
                                </a>
                            )}

                            <div className="flex gap-2 mt-4">
                                <Button variant="ghost" className="flex-1" onClick={resetDialog}>
                                    <RefreshCw className="w-4 h-4 mr-2" /> Upload Another
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={onClose}>
                                    <X className="w-4 h-4 mr-2" /> Close
                                </Button>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 h-2 animate-pulse w-full"></div>
                            </div>
                            <p className="text-xs text-center text-slate-500">Processing contractor records, please wait...</p>
                        </div>
                    )}

                    {!files && !isUploading && (
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleUpload} disabled={!file}>
                            Start Upload
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}