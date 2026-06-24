import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter"; 
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ContractorFormPage() {
    const { id } = useParams<{ id: string }>(); 
    const [, setLocation] = useLocation();      
    const { toast } = useToast();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nameOfTheAgency: "", contractorCode: "", jobSummary: "",
        address1: "", address2: "", district: "", pincode: "", state: "",
        experienceInSimilarField: "", commencementDate: "", associatedWithZimInYears: "",
        referenceBy: "", manpowerServiceAvailableInZim: "", totalManpowerServiceAvailableWithTheVendor: "",
        percentageUtilizedInZim: "", workingWithOtherVendors: "", nameOfAgencyOwner: "",
        contactNoOwner: "", nameOfTheRepresentative: "", contactNoRepresentative: "",
        emailAddress: "", agreementFromDate: "", agreementValidUpto: "",
        licenseNo: "", licensedQuantity: "", licenseValidity: "",
        gstNo: "", pfCodeNo: "", esicCodeNo: "",
        bankAccountNo: "", bankName: "", ifcCode: "", status: "active"
    });

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            fetch(`/api/contractors/${id}`)
                .then(res => res.json())
                .then(data => {
                    // Safe parsing function to handle data load smoothly
                    const safeDateFormat = (dateStr: any) => {
                        if (!dateStr) return "";
                        return dateStr.split('T')[0]; // simple split safely manages standard HTML format
                    };

                    setFormData({
                        ...data,
                        commencementDate: safeDateFormat(data.commencementDate),
                        agreementFromDate: safeDateFormat(data.agreementFromDate),
                        agreementValidUpto: safeDateFormat(data.agreementValidUpto),
                        licenseValidity: safeDateFormat(data.licenseValidity),
                    });
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [id, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formatBackendDate = (dateVal: any) => {
        if (!dateVal || dateVal === "") return null;
        if (typeof dateVal === 'string') {
            return dateVal.split('T')[0];
        }
        return null;
    };

    // ⬇️ 1. 'createdAt' aur 'id' ko formData se alag nikal lijiye ⬇️
    const { createdAt, id: contractorId, ...restFormData } = formData as any;

    // ⬇️ 2. Payload mein ab 'restFormData' bhejiye takki extra fields na jayein ⬇️
    const payload = {
        ...restFormData,
        associatedWithZimInYears: formData.associatedWithZimInYears ? parseInt(formData.associatedWithZimInYears) : null,
        manpowerServiceAvailableInZim: formData.manpowerServiceAvailableInZim ? parseInt(formData.manpowerServiceAvailableInZim) : null,
        totalManpowerServiceAvailableWithTheVendor: formData.totalManpowerServiceAvailableWithTheVendor ? parseInt(formData.totalManpowerServiceAvailableWithTheVendor) : null,
        licensedQuantity: formData.licensedQuantity ? parseInt(formData.licensedQuantity) : null,
        
        commencementDate: formatBackendDate(formData.commencementDate),
        agreementFromDate: formatBackendDate(formData.agreementFromDate),
        agreementValidUpto: formatBackendDate(formData.agreementValidUpto),
        licenseValidity: formatBackendDate(formData.licenseValidity),
    };

    const url = isEditMode ? `/api/contractors/${id}` : "/api/contractors";
    const method = isEditMode ? "PATCH" : "POST"; 

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast({ title: `Contractor ${isEditMode ? 'updated' : 'added'} successfully!` });
                setLocation("/contractors"); 
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to save");
            }
        } catch (error: any) {
            toast({ 
                title: error.message || "Something went wrong", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) return <div className="p-6 text-center font-bold text-slate-600">Loading Contractor Data...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-[#0f172a]">{isEditMode ? "Edit Contractor" : "Add New Contractor"}</h1>
                <Button variant="outline" onClick={() => setLocation("/contractors")}>Cancel</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 border rounded-lg shadow-sm">
                
                {/* 1. AGENCY & OWNER DETAILS */}
                <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">1. Agency & Owner Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Contractor Name *</label>
                            <input required name="nameOfAgencyOwner" value={formData.nameOfAgencyOwner || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Contractor Code *</label>
                            <input required disabled={isEditMode} name="contractorCode" value={formData.contractorCode || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-slate-50 disabled:opacity-60" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Agency Name *</label>
                            <input required name="nameOfTheAgency" value={formData.nameOfTheAgency || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Mobile Number*</label>
                            <input required name="contactNoOwner" value={formData.contactNoOwner || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Email Address</label>
                            <input type="email" name="emailAddress" value={formData.emailAddress || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Representative Name</label>
                            <input name="nameOfTheRepresentative" value={formData.nameOfTheRepresentative || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Representative Mobile</label>
                            <input name="contactNoRepresentative" value={formData.contactNoRepresentative || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Status</label>
                            <select name="status" value={formData.status || "active"} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. ADDRESS & LOCATION */}
                <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">2. Address & Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold mb-1 text-slate-700">Address Line 1</label>
                            <input name="address1" value={formData.address1 || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Address Line 2</label>
                            <input name="address2" value={formData.address2 || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">District</label>
                            <input name="district" value={formData.district || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">State</label>
                            <input name="state" value={formData.state || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Pincode</label>
                            <input name="pincode" value={formData.pincode || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                    </div>
                </div>

                {/* 3. AGREEMENTS, EXPERIENCE & LICENSES */}
                <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">3. Experience, Agreements & Licenses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Commencement Date</label>
                            <input type="date" name="commencementDate" value={formData.commencementDate || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Agreement From Date</label>
                            <input type="date" name="agreementFromDate" value={formData.agreementFromDate || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Agreement Valid Upto</label>
                            <input type="date" name="agreementValidUpto" value={formData.agreementValidUpto || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">License No</label>
                            <input name="licenseNo" value={formData.licenseNo || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Licensed Quantity</label>
                            <input name="licensedQuantity" value={formData.licensedQuantity || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">License Validity</label>
                            <input type="date" name="licenseValidity" value={formData.licenseValidity || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Experience (In Years)</label>
                            <input name="experienceInSimilarField" value={formData.experienceInSimilarField || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Associated With ZIM (Years)</label>
                            <input name="associatedWithZimInYears" value={formData.associatedWithZimInYears || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Reference By</label>
                            <input name="referenceBy" value={formData.referenceBy || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                    </div>
                </div>

                {/* 4. STATUTORY & BANK DETAILS */}
                <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">4. Statutory & Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">GST No</label>
                            <input name="gstNo" value={formData.gstNo || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">PF Code No</label>
                            <input name="pfCodeNo" value={formData.pfCodeNo || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">ESIC Code No</label>
                            <input name="esicCodeNo" value={formData.esicCodeNo || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Bank Name</label>
                            <input name="bankName" value={formData.bankName || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Account Number</label>
                            <input name="bankAccountNo" value={formData.bankAccountNo || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">IFSC Code</label>
                            <input name="ifcCode" value={formData.ifcCode || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                    </div>
                </div>

                {/* 5. JOB SUMMARY & MANPOWER */}
                <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">5. Job Summary & Manpower</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-700">Job Summary</label>
                            <textarea name="jobSummary" rows={3} value={formData.jobSummary || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-700">Manpower in ZIM</label>
                                <input name="manpowerServiceAvailableInZim" value={formData.manpowerServiceAvailableInZim || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-700">Total Vendor Manpower</label>
                                <input name="totalManpowerServiceAvailableWithTheVendor" value={formData.totalManpowerServiceAvailableWithTheVendor || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-700">% Utilized in ZIM</label>
                                <input name="percentageUtilizedInZim" value={formData.percentageUtilizedInZim || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-700">Other Vendors Name</label>
                                <input name="workingWithOtherVendors" value={formData.workingWithOtherVendors || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button type="button" variant="outline" onClick={() => setLocation("/contractors")} disabled={loading}>Cancel</Button>
                    <Button type="submit" className="bg-[#5c54d5] hover:bg-[#4c44c5] text-white" disabled={loading}>
                        {loading ? "Saving..." : isEditMode ? "Update Contractor" : "Save Contractor"}
                    </Button>
                </div>
            </form>
        </div>
    );
}