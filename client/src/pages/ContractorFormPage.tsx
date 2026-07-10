import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { validateNoHtml } from "@/lib/validation";
// Interface for Frontend Validation Errors
interface FormErrors {
  nameOfAgencyOwner?: string;
  contractorCode?: string;
  nameOfTheAgency?: string;
  contactNoOwner?: string;
  emailAddress?: string;
}

export default function ContractorFormPage() {

  
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditMode = !!id;
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);

  // New state to keep track of individual field errors
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    nameOfTheAgency: "",
    contractorCode: "",
    jobSummary: "",
    address1: "",
    address2: "",
    district: "",
    pincode: "",
    state: "",
    experienceInSimilarField: "",
    commencementDate: "",
    associatedWithZimInYears: "",
    referenceBy: "",
    manpowerServiceAvailableInZim: "",
    totalManpowerServiceAvailableWithTheVendor: "",
    percentageUtilizedInZim: "",
    workingWithOtherVendors: "",
    nameOfAgencyOwner: "",
    contactNoOwner: "",
    nameOfTheRepresentative: "",
    contactNoRepresentative: "",
    emailAddress: "",
    agreementFromDate: "",
    agreementValidUpto: "",
    licenseNo: "",
    licensedQuantity: "",
    licenseValidity: "",
    gstNo: "",
    pfCodeNo: "",
    esicCodeNo: "",
    bankAccountNo: "",
    bankName: "",
    ifcCode: "",
    status: "active",
  });

  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      fetch(`/api/contractors/${id}`)
        .then((res) => res.json())
        .then((data) => {
          const safeDateFormat = (dateStr: any) => {
            if (!dateStr) return "";
            return dateStr.split("T")[0];
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

  // Frontend Validation Logic
  const validateForm = (): boolean => {
    // const newErrors: FormErrors = {};
    let newErrors: FormErrors = {};
    // 1. Mandatory Fields Checks
    if (!formData.nameOfAgencyOwner || !formData.nameOfAgencyOwner.trim()) {
      newErrors.nameOfAgencyOwner = "Contractor Name cannot be empty.";
    }
    if (!formData.contractorCode || !formData.contractorCode.trim()) {
      newErrors.contractorCode = "Contractor Code cannot be empty.";
    }
    if (!formData.nameOfTheAgency || !formData.nameOfTheAgency.trim()) {
      newErrors.nameOfTheAgency = "Agency Name cannot be empty.";
    }
    if (!formData.contactNoOwner || !formData.contactNoOwner.trim()) {
      newErrors.contactNoOwner = "Mobile Number cannot be empty.";
    } else if (!/^[6-9]\d{9}$/.test(formData.contactNoOwner.trim())) {
      newErrors.contactNoOwner =
        "Enter a valid mobile number (must be 10 digits and start with 6, 7, 8, or 9).";
    }
    // 2. Mobile Number Length Check (Strictly 10 digits check)
    else if (!/^\d{10}$/.test(formData.contactNoOwner.trim())) {
      newErrors.contactNoOwner = "Mobile number must be exactly 10 digits.";
    }

    // 3. Email Format Check (Only if user has filled something)
    if (formData.emailAddress && formData.emailAddress.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emailAddress.trim())) {
        newErrors.emailAddress = "Please enter a valid email address.";
      }
    }
    // 🌟 4. HTML TAG DETECTOR (Aapka Function) 🌟
    // Ye pooray formData ko scan karega aur jis field me HTML hoga usme error set kar dega
    const htmlErrors = validateNoHtml(formData);
    if (Object.keys(htmlErrors).length > 0) {
      newErrors = { ...newErrors, ...htmlErrors };
    }
    setErrors(newErrors);
    // Return true if no errors found
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    if (name === "contactNoOwner" || name === "contactNoRepresentative") {
      // Agar value me numbers ke alawa kuch bhi ho, to use allow mat karo
      if (value !== "" && !/^\d+$/.test(value)) {
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear individual error as the user starts typing again
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check local validation before sending request
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please clear the highlighted fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const formatBackendDate = (dateVal: any) => {
      if (!dateVal || dateVal === "") return null;
      if (typeof dateVal === "string") {
        return dateVal.split("T")[0];
      }
      return null;
    };

    const { createdAt, id: contractorId, ...restFormData } = formData as any;
    const payload: Record<string, any> = {};

    Object.keys(restFormData).forEach((key) => {
      const val = restFormData[key];
      if (val === "") {
        payload[key] = null;
      } else {
        payload[key] = val;
      }
    });

    const intFields = [
      "associatedWithZimInYears",
      "manpowerServiceAvailableInZim",
      "totalManpowerServiceAvailableWithTheVendor",
      "licensedQuantity",
    ];

    intFields.forEach((field) => {
      if (formData[field as keyof typeof formData]) {
        const parsed = parseInt(
          formData[field as keyof typeof formData] as string,
          10,
        );
        payload[field] = isNaN(parsed) ? null : parsed;
      } else {
        payload[field] = null;
      }
    });

    payload.commencementDate = formatBackendDate(formData.commencementDate);
    payload.agreementFromDate = formatBackendDate(formData.agreementFromDate);
    payload.agreementValidUpto = formatBackendDate(formData.agreementValidUpto);
    payload.licenseValidity = formatBackendDate(formData.licenseValidity);

    const url = isEditMode ? `/api/contractors/${id}` : "/api/contractors";
    const method = isEditMode ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: `Contractor ${isEditMode ? "updated" : "added"} successfully!`,
        });
        setLocation("/contractors");
      } else {
        const errorData = await res.json().catch(() => ({}));

        // Catch Backend Duplicate Code Error and map it directly under the Contractor Code input box
        if (errorData.message && errorData.message.includes("DUPLICATE_CODE")) {
          setErrors((prev) => ({
            ...prev,
            contractorCode: "This Contractor Code already exists.",
          }));
          setActiveTab("personal"); // Switch back to personal tab if duplicate happens
          throw new Error("Duplicate contractor code detected.");
        }

        throw new Error(errorData.message || "Failed to save");
      }
    } catch (error: any) {
      toast({
        title: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode)
    return (
      <div className="p-6 text-center font-bold text-slate-600">
        Loading Contractor Data...
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-[#0f172a]">
          {isEditMode ? "Edit Contractor" : "Add New Contractor"}
        </h1>
        <Button variant="outline" onClick={() => setLocation("/contractors")}>
          Cancel
        </Button>
      </div>

      <form
  onSubmit={handleSubmit}
  className="space-y-6 bg-white p-6 border rounded-lg shadow-sm"
>
  <div className="flex border-b mb-6">
    <button
      type="button"
      onClick={() => setActiveTab("personal")}
      className={`px-4 py-2 ${
        activeTab === "personal"
          ? "border-b-2 border-[#5c54d5] text-[#5c54d5] font-bold"
          : "text-gray-500"
      }`}
    >
      Personal Details
    </button>

          <button
            type="button"
            onClick={() => {
              // Only allow moving to next tabs if current inputs in personal are valid
              if (validateForm()) setActiveTab("agreement");
            }}
            className={`px-4 py-2 ${
              activeTab === "agreement"
                ? "border-b-2 border-[#5c54d5] text-[#5c54d5] font-bold"
                : "text-gray-500"
            }`}
          >
            Agreement & Compliance
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateForm()) setActiveTab("operations");
            }}
            className={`px-4 py-2 ${
              activeTab === "operations"
                ? "border-b-2 border-[#5c54d5] text-[#5c54d5] font-bold"
                : "text-gray-500"
            }`}
          >
            Operations
          </button>
        </div>

        {activeTab === "personal" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">
                1. Agency & Owner Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Contractor Name *
                  </label>
                  <input
                    name="nameOfAgencyOwner"
                    value={formData.nameOfAgencyOwner || ""}
                    onChange={handleChange}
                    className={`w-full border rounded p-2 text-sm focus:outline-[#5c54d5] ${errors.nameOfAgencyOwner ? "border-red-500" : ""}`}
                  />
                  {errors.nameOfAgencyOwner && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">
                      {errors.nameOfAgencyOwner}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Contractor Code *
                  </label>
                  <input
                    disabled={isEditMode}
                    name="contractorCode"
                    autoComplete="off"
                    value={formData.contractorCode || ""}
                    onChange={handleChange}
                    className={`w-full border rounded p-2 text-sm disabled:opacity-60 ${errors.contractorCode ? "border-red-500 focus:outline-red-500" : ""}`}
                  />
                  {errors.contractorCode && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">
                      {errors.contractorCode}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Agency Name *
                  </label>
                  <input
                    name="nameOfTheAgency"
                    value={formData.nameOfTheAgency || ""}
                    onChange={handleChange}
                    className={`w-full border rounded p-2 text-sm focus:outline-[#5c54d5] ${errors.nameOfTheAgency ? "border-red-500" : ""}`}
                  />
                  {errors.nameOfTheAgency && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">
                      {errors.nameOfTheAgency}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    name="contactNoOwner"
                    value={formData.contactNoOwner || ""}
                    onChange={handleChange}
                    className={`w-full border rounded p-2 text-sm focus:outline-[#5c54d5] ${errors.contactNoOwner ? "border-red-500" : ""}`}
                  />
                  {errors.contactNoOwner && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">
                      {errors.contactNoOwner}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="text"
                    name="emailAddress"
                    value={formData.emailAddress || ""}
                    onChange={handleChange}
                    className={`w-full border rounded p-2 text-sm focus:outline-[#5c54d5] ${errors.emailAddress ? "border-red-500" : ""}`}
                  />
                  {errors.emailAddress && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">
                      {errors.emailAddress}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Representative Name
                  </label>
                  <input
                    name="nameOfTheRepresentative"
                    value={formData.nameOfTheRepresentative || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Representative Mobile
                  </label>
                  <input
                    maxLength={10}
                    name="contactNoRepresentative"
                    value={formData.contactNoRepresentative || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status || "active"}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. ADDRESS & LOCATION */}
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">
                2. Address & Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">
                      Address Line 1
                    </label>
                    <input
                      name="address1"
                      value={formData.address1 || ""}
                      onChange={handleChange}
                      className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">
                      Address Line 2
                    </label>
                    <input
                      name="address2"
                      value={formData.address2 || ""}
                      onChange={handleChange}
                      className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    District
                  </label>
                  <input
                    name="district"
                    value={formData.district || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    State
                  </label>
                  <input
                    name="state"
                    value={formData.state || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Pincode
                  </label>
                  <input
                    name="pincode"
                    value={formData.pincode || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "agreement" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">
                3. Experience, Agreements & Licenses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Commencement Date
                  </label>
                  <input
                    type="date"
                    name="commencementDate"
                    value={formData.commencementDate || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Agreement From Date
                  </label>
                  <input
                    type="date"
                    name="agreementFromDate"
                    value={formData.agreementFromDate || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Agreement Valid Upto
                  </label>
                  <input
                    type="date"
                    name="agreementValidUpto"
                    value={formData.agreementValidUpto || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    License No
                  </label>
                  <input
                    name="licenseNo"
                    value={formData.licenseNo || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Licensed Quantity
                  </label>
                  <input
                    name="licensedQuantity"
                    value={formData.licensedQuantity || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    License Validity
                  </label>
                  <input
                    type="date"
                    name="licenseValidity"
                    value={formData.licenseValidity || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Experience (In Years)
                  </label>
                  <input
                    name="experienceInSimilarField"
                    value={formData.experienceInSimilarField || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Associated With ZIM (Years)
                  </label>
                  <input
                    name="associatedWithZimInYears"
                    value={formData.associatedWithZimInYears || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Reference By
                  </label>
                  <input
                    name="referenceBy"
                    value={formData.referenceBy || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">
                4. Statutory & Bank Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    GST No
                  </label>
                  <input
                    name="gstNo"
                    value={formData.gstNo || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    PF Code No
                  </label>
                  <input
                    name="pfCodeNo"
                    value={formData.pfCodeNo || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    ESIC Code No
                  </label>
                  <input
                    name="esicCodeNo"
                    value={formData.esicCodeNo || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Bank Name
                  </label>
                  <input
                    name="bankName"
                    value={formData.bankName || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Account Number
                  </label>
                  <input
                    name="bankAccountNo"
                    value={formData.bankAccountNo || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    IFSC Code
                  </label>
                  <input
                    name="ifcCode"
                    value={formData.ifcCode || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">
              5. Job Summary & Manpower
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">
                  Job Summary
                </label>
                <textarea
                  name="jobSummary"
                  rows={3}
                  value={formData.jobSummary || ""}
                  onChange={handleChange}
                  className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Manpower in ZIM
                  </label>
                  <input
                    name="manpowerServiceAvailableInZim"
                    value={formData.manpowerServiceAvailableInZim || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Total Vendor Manpower
                  </label>
                  <input
                    name="totalManpowerServiceAvailableWithTheVendor"
                    value={
                      formData.totalManpowerServiceAvailableWithTheVendor || ""
                    }
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    % Utilized in ZIM
                  </label>
                  <input
                    name="percentageUtilizedInZim"
                    value={formData.percentageUtilizedInZim || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    Other Vendors Name
                  </label>
                  <input
                    name="workingWithOtherVendors"
                    value={formData.workingWithOtherVendors || ""}
                    onChange={handleChange}
                    className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-t pt-4 mt-6">
          <div className="text-sm text-slate-400 font-medium capitalize">
            Step: {activeTab}
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== "personal" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === "agreement") {
                    setActiveTab("personal");
                  } else if (activeTab === "operations") {
                    setActiveTab("agreement");
                  }
                }}
              >
                Previous
              </Button>
            )}
            {activeTab !== "operations" ? (
              <Button
                type="button"
                disabled={loading} // API call ke samay double-click block karne ke liye
                onClick={async (e) => {
                  e.preventDefault();

                  // 1. Pehle frontend verification (Empty fields, Mobile, Email, HTML tags)
                  if (!validateForm()) return;

                  // 2. Agar user PEHLE TAB par hai, to NEXT click par duplicate check karo
                  if (activeTab === "personal") {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/contractors");
                      if (res.ok) {
                        const resData = await res.json();

                        // Safe Array Extraction: Agar response directly array na ho kar { data: [...] } ho
                        const existingContractors = Array.isArray(resData)
                          ? resData
                          : resData.data || resData.contractors || [];

                        const currentCode = formData.contractorCode
                          ? formData.contractorCode.trim().toLowerCase()
                          : "";

                        // Strict check: List me duplicate code dhoodho
                        const isDuplicate = existingContractors.some(
                          (c: any) => {
                            if (!c.contractorCode) return false;

                            const dbCode = c.contractorCode
                              .trim()
                              .toLowerCase();
                            const isSameCode = dbCode === currentCode;

                            // Edit mode validation line
                            if (isEditMode && id) {
                              return isSameCode && String(c.id) !== String(id);
                            }

                            return isSameCode;
                          },
                        );

                        if (isDuplicate) {
                          // 1. Error state set karo taaki input ke niche red text aa jaye
                          setErrors((prev) => ({
                            ...prev,
                            contractorCode:
                              "This Contractor Code already exists.",
                          }));

                          // ✅ Browser alert pop-up ko yahan se hata diya hai taaki smooth experience mile

                          setLoading(false);
                          return; // 🛑 Agle tab par jaane se yahin block kar diya
                        }
                      }
                    } catch (err) {
                      console.error("Error verifying duplicate code:", err);
                    } finally {
                      setLoading(false);
                    }
                  }

                  // 3. Agar duplicate NAI mila (ya doosra tab hai), to hi tab change hoga
                  if (activeTab === "personal") {
                    setActiveTab("agreement");
                  } else if (activeTab === "agreement") {
                    setActiveTab("operations");
                  }
                }}
              >
                {loading && activeTab === "personal" ? "Checking..." : "Next"}
              </Button>
            ) : (
              <Button
                type="submit"
                className="bg-[#5c54d5] hover:bg-[#4c44c5] text-white"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : isEditMode
                    ? "Update Contractor"
                    : "Save Contractor"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
