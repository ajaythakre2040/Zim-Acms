import React, { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { validateNoHtml } from "@/lib/validation";

// Complete Interface for Frontend Validation Errors
interface FormErrors {
  employeeName?: string;
  employeeCode?: string;
  phone?: string;
  email?: string;
  overtimeRate?: string;
  perDayRate?: string;
  perHourRate?: string;
}

export default function PeopleFormPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Wouter dynamic route pattern to check if we are in Edit Mode and extract the ID
  const [match, params] = useRoute("/employees/edit/:id");
  const id = params?.id || null;
  const isEditMode = !!match && !!id;

  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Exact mapping matching the schema columns
  const [formData, setFormData] = useState({
    // --- PEOPLE MASTER TABLE ---
    employeeName: "",
    employeeCode: "",
    email: "",
    phone: "",
    gender: "male",
    dateOfBirth: "",
    dateOfJoining: "",
    dateOfResignation: "",
    personType: "employee",
    status: "active",
    fatherName: "",
    emergencyContact: "",
    bloodGroup: "",
    qualification: "",
    experience: "",
    
    // Identifiers & Compliance
    panNumber: "",
    aadhaarNumber: "",
    passportNumber: "",
    pfNumber: "",
    esiNumber: "",
    
    // Bank Details
    bankName: "",
    bankAccountNo: "",
    bankIfsc: "",
    
    // Operational Dropdowns / Foreign Keys (Numeric)
    roleId: "",
    msId: "",
    departmentId: "",
    shiftId: "",
    designationId: "",
    companyId: "",
    locationId: "",
    ruleid: "",
    lastPunchDoorId: "",
    riskTier: "1",

    // System Settings & Shifts
    overtimeEligible: false,
    overtimeRate: "",
    shiftType: "fixed",
    is_lockout_enabled: false,
    isNightShiftActive: false,
    activeShiftDate: "",
    currentZone: "OUT",
    photoUrl: "",
    externalId: "",
    sourceSystem: "",

    // --- ADDITIONAL DETAILS TABLE ---
    cardNo: "",
    companyUnit: "",
    guardianName: "",
    serviceCategory: "",
    section: "",
    employment: "",
    employerName: "",
    maritalStatus: "",
    reportingManager: "",
    leavingReason: "",
    stream: "",
    perDayRate: "",
    perHourRate: "",
    uanNumber: "",
    selfDeclaration: "",
    policeVerification: "",
    authorizedDevice: "",

    // Present Address Breakdown
    presentAddress1: "",
    presentAddress2: "",
    presentDistrict: "",
    presentPincode: "",
    presentState: "",

    // Permanent Address Breakdown
    permanentAddress1: "",
    permanentAddress2: "",
    permanentDistrict: "",
    permanentPincode: "",
    permanentState: "",
  });

  useEffect(() => {
    if (isEditMode && id) {
      setLoading(true);
      fetch(`/api/people/${id}`)
        .then((res) => res.json())
        .then((data) => {
          const safeDateFormat = (dateStr: any) => {
            if (!dateStr) return "";
            return dateStr.split("T")[0];
          };

          // Merging data arriving from both endpoints or a joined record
          setFormData((prev) => ({
            ...prev,
            ...data,
            dateOfBirth: safeDateFormat(data.dateOfBirth),
            dateOfJoining: safeDateFormat(data.dateOfJoining),
            dateOfResignation: safeDateFormat(data.dateOfResignation),
            activeShiftDate: safeDateFormat(data.activeShiftDate),
          }));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id, isEditMode]);

  // Frontend Validation Logic matching updated keys
  const validateForm = (): boolean => {
    let newErrors: FormErrors = {};

    if (!formData.employeeName || !formData.employeeName.trim()) {
      newErrors.employeeName = "Employee Name cannot be empty.";
    }
    if (!formData.employeeCode || !formData.employeeCode.trim()) {
      newErrors.employeeCode = "Employee Code cannot be empty.";
    }
    if (formData.phone && formData.phone.trim() !== "") {
      if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
        newErrors.phone = "Enter a valid 10-digit mobile number starting with 6-9.";
      }
    }
    if (formData.email && formData.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address.";
      }
    }

    // Number rates valid structures check
    if (formData.overtimeRate && isNaN(Number(formData.overtimeRate))) newErrors.overtimeRate = "Must be a valid amount";
    if (formData.perDayRate && isNaN(Number(formData.perDayRate))) newErrors.perDayRate = "Must be a valid amount";
    if (formData.perHourRate && isNaN(Number(formData.perHourRate))) newErrors.perHourRate = "Must be a valid amount";

    const htmlErrors = validateNoHtml(formData);
    if (Object.keys(htmlErrors).length > 0) {
      newErrors = { ...newErrors, ...htmlErrors };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    // Number constraints rules
    if (["phone", "emergencyContact", "presentPincode", "permanentPincode"].includes(name)) {
      if (value !== "" && !/^\d+$/.test(value)) return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please resolve the errors across the tabs before submission.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const formatBackendDate = (dateVal: any) => {
      if (!dateVal || dateVal === "") return null;
      return typeof dateVal === "string" ? dateVal.split("T")[0] : null;
    };

    const { createdAt, updatedAt, id: empId, ...restFormData } = formData as any;
    const payload: Record<string, any> = {};

    // Converting emptystrings to null and numbers parsing accurately
    Object.keys(restFormData).forEach((key) => {
      const val = restFormData[key];
      if (val === "") {
        payload[key] = null;
      } else if ([
        "roleId", "msId", "departmentId", "shiftId", "designationId", 
        "companyId", "locationId", "ruleid", "lastPunchDoorId", "riskTier"
      ].includes(key)) {
        payload[key] = parseInt(val, 10) || null;
      } else if (["overtimeRate", "perDayRate", "perHourRate"].includes(key)) {
        payload[key] = parseFloat(val) || null;
      } else {
        payload[key] = val;
      }
    });

    payload.dateOfBirth = formatBackendDate(formData.dateOfBirth);
    payload.dateOfJoining = formatBackendDate(formData.dateOfJoining);
    payload.dateOfResignation = formatBackendDate(formData.dateOfResignation);
    payload.activeShiftDate = formatBackendDate(formData.activeShiftDate);

    const url = isEditMode ? `/api/people/${id}` : "/api/people";
    const method = isEditMode ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: `Employee Profile ${isEditMode ? "updated" : "created"} successfully!`,
        });
        setLocation("/employees");
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.message && errorData.message.includes("DUPLICATE_CODE")) {
          setErrors((prev) => ({
            ...prev,
            employeeCode: "This Employee Code is already registered.",
          }));
          setActiveTab("personal");
          throw new Error("Duplicate code match found in database.");
        }
        throw new Error(errorData.message || "Execution engine failure");
      }
    } catch (error: any) {
      toast({
        title: error.message || "Operation failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode)
    return (
      <div className="p-6 text-center font-bold text-slate-600 tracking-wide animate-pulse">
        Fetching Active Profile Records...
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">
          {isEditMode ? "Modify Employee Record" : "Register New Personnel"}
        </h1>
        <Button variant="outline" onClick={() => setLocation("/employees")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 border rounded-lg shadow-sm">
        {/* Navigation Tabs Setup */}
        <div className="flex border-b mb-6 overflow-x-auto whitespace-nowrap">
          {["personal", "job", "compliance", "address"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { if (tab === "personal" || validateForm()) setActiveTab(tab); }}
              className={`px-4 py-2 text-sm transition-all capitalize ${
                activeTab === tab
                  ? "border-b-2 border-[#5c54d5] text-[#5c54d5] font-bold"
                  : "text-gray-500 font-medium"
              }`}
            >
              {tab === "compliance" ? "Compliance & Banking" : tab === "job" ? "Job & Operational" : `${tab} details`}
            </button>
          ))}
        </div>

        {/* Tab 1: Personal Details */}
        {activeTab === "personal" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">1. Primary Profile Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Employee Name *</label>
                  <input name="employeeName" value={formData.employeeName || ""} onChange={handleChange} className={`w-full border rounded p-2 text-sm focus:outline-[#5c54d5] ${errors.employeeName ? "border-red-500" : ""}`} />
                  {errors.employeeName && <p className="text-red-500 text-[11px] mt-1 font-semibold">{errors.employeeName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Employee Code *</label>
                  <input disabled={isEditMode} name="employeeCode" value={formData.employeeCode || ""} onChange={handleChange} className={`w-full border rounded p-2 text-sm disabled:opacity-60 ${errors.employeeCode ? "border-red-500" : ""}`} />
                  {errors.employeeCode && <p className="text-red-500 text-[11px] mt-1 font-semibold">{errors.employeeCode}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Gender</label>
                  <input name="gender" value={formData.gender || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" placeholder="Male/Female" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">2. Relations & Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Phone/Mobile</label>
                  <input type="text" maxLength={10} name="phone" value={formData.phone || ""} onChange={handleChange} className={`w-full border rounded p-2 text-sm focus:outline-[#5c54d5] ${errors.phone ? "border-red-500" : ""}`} />
                  {errors.phone && <p className="text-red-500 text-[11px] mt-1 font-semibold">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Email</label>
                  <input type="text" name="email" value={formData.email || ""} onChange={handleChange} className={`w-full border rounded p-2 text-sm focus:outline-[#5c54d5] ${errors.email ? "border-red-500" : ""}`} />
                  {errors.email && <p className="text-red-500 text-[11px] mt-1 font-semibold">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Father's Name</label>
                  <input name="fatherName" value={formData.fatherName || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Emergency Phone</label>
                  <input type="text" maxLength={10} name="emergencyContact" value={formData.emergencyContact || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">3. Background Check & Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Blood Group</label>
                  <input name="bloodGroup" value={formData.bloodGroup || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Marital Status</label>
                  <input name="maritalStatus" value={formData.maritalStatus || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" placeholder="Single/Married" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Qualification</label>
                  <input name="qualification" value={formData.qualification || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Experience</label>
                  <input name="experience" value={formData.experience || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Job & Operational Details */}
        {activeTab === "job" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">4. System Deployment IDs & Core Work Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Department ID (Numeric)</label>
                  <input name="departmentId" value={formData.departmentId || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Designation ID (Numeric)</label>
                  <input name="designationId" value={formData.designationId || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Shift ID (Numeric)</label>
                  <input name="shiftId" value={formData.shiftId || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Company ID (Numeric)</label>
                  <input name="companyId" value={formData.companyId || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">5. Employment Timeline & Specific Section Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Date of Joining</label>
                  <input type="date" name="dateOfJoining" value={formData.dateOfJoining || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Date of Resignation</label>
                  <input type="date" name="dateOfResignation" value={formData.dateOfResignation || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Person Type Enum</label>
                  <select name="personType" value={formData.personType} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]">
                    <option value="employee">employee</option>
                    <option value="contractor">contractor</option>
                    <option value="visitor">visitor</option>
                    <option value="intern">intern</option>
                    <option value="consultant">consultant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Stream Matrix</label>
                  <input name="stream" value={formData.stream || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" placeholder="Commerce / Science" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Section Assignment</label>
                  <input name="section" value={formData.section || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Reporting Manager Mapping</label>
                  <input name="reportingManager" value={formData.reportingManager || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">6. Device & Access Hardware Specifications (eSSL Sync)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Card No</label>
                  <input name="cardNo" value={formData.cardNo || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Authorized Device Token</label>
                  <input name="authorizedDevice" value={formData.authorizedDevice || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Shift Type Enum</label>
                  <select name="shiftType" value={formData.shiftType} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]">
                    <option value="fixed">Fixed</option>
                    <option value="rotational">Rotational</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Risk Tier Level</label>
                  <input type="number" name="riskTier" value={formData.riskTier || "1"} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-center mt-4 bg-slate-50 p-3 rounded border">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" name="overtimeEligible" checked={formData.overtimeEligible} onChange={handleChange} className="h-4 w-4 text-[#5c54d5]" />
                  <span>Overtime Eligible</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" name="is_lockout_enabled" checked={formData.is_lockout_enabled} onChange={handleChange} className="h-4 w-4 text-[#5c54d5]" />
                  <span>Lockout Enabled</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" name="isNightShiftActive" checked={formData.isNightShiftActive} onChange={handleChange} className="h-4 w-4 text-[#5c54d5]" />
                  <span>Night Shift Active</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Compliance & Banking */}
        {activeTab === "compliance" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">7. Government Legal Identities</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">PAN Card Number</label>
                  <input name="panNumber" value={formData.panNumber || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Aadhaar Number Identification</label>
                  <input name="aadhaarNumber" value={formData.aadhaarNumber || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Passport Identity Track</label>
                  <input name="passportNumber" value={formData.passportNumber || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">8. Provident Fund & Employee Insurance Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">UAN Number Tracking</label>
                  <input name="uanNumber" value={formData.uanNumber || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">PF Registration Code</label>
                  <input name="pfNumber" value={formData.pfNumber || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">ESI Insurance Document Id</label>
                  <input name="esiNumber" value={formData.esiNumber || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">9. Bank Routing Account Matrix</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Bank Name</label>
                  <input name="bankName" value={formData.bankName || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Account Registration Number</label>
                  <input name="bankAccountNo" value={formData.bankAccountNo || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">IFSC Branch Code</label>
                  <input name="bankIfsc" value={formData.bankIfsc || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 border-b pb-1">10. Payout & Fee Configurations</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Per Day Rate</label>
                  <input name="perDayRate" value={formData.perDayRate || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Per Hour Rate</label>
                  <input name="perHourRate" value={formData.perHourRate || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Overtime Rate</label>
                  <input name="overtimeRate" value={formData.overtimeRate || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Status Control</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border rounded p-2 text-sm focus:outline-[#5c54d5]">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                    <option value="terminated">terminated</option>
                    <option value="on_leave">on_leave</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Address Breakdown Details */}
        {activeTab === "address" && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 border rounded shadow-sm">
              <h3 className="text-sm font-bold uppercase text-[#5c54d5] mb-4 border-b pb-1">11. Present Residential Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Address Line 1</label>
                  <input name="presentAddress1" value={formData.presentAddress1 || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Address Line 2</label>
                  <input name="presentAddress2" value={formData.presentAddress2 || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">District</label>
                  <input name="presentDistrict" value={formData.presentDistrict || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">State</label>
                  <input name="presentState" value={formData.presentState || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Pincode</label>
                  <input type="text" maxLength={6} name="presentPincode" value={formData.presentPincode || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border rounded shadow-sm">
              <h3 className="text-sm font-bold uppercase text-[#5c54d5] mb-4 border-b pb-1">12. Permanent Native Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Address Line 1</label>
                  <input name="permanentAddress1" value={formData.permanentAddress1 || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Address Line 2</label>
                  <input name="permanentAddress2" value={formData.permanentAddress2 || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">District</label>
                  <input name="permanentDistrict" value={formData.permanentDistrict || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">State</label>
                  <input name="permanentState" value={formData.permanentState || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Pincode</label>
                  <input type="text" maxLength={6} name="permanentPincode" value={formData.permanentPincode || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm bg-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Action Buttons Container */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setLocation("/employees")}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#5c54d5] hover:bg-[#4a43b8] text-white font-bold px-6">
            {isEditMode ? "Update Profile" : "Save Record"}
          </Button>
        </div>
      </form>
    </div>
  );
}