import { useParams, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function EmployeeView() {
  const [, params] = useRoute("/employees/view/:id");
  const [, navigate] = useLocation();
  const id = params?.id;

  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const response = await fetch(`/api/people/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch employee details");
      }

      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading employee details...
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Employee not found
      </div>
    );
  }

  // Date formatter helper function
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 flex justify-center">
      <Card className="relative w-full max-w-[950px] shadow-xl">
        {/* Back Button */}
        <div className="absolute top-4 left-4 print:hidden">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 border rounded-md bg-white hover:bg-slate-50 transition-all text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center border-b pb-5 mb-8">
            <h1 className="text-3xl font-bold text-[#5c54d5]">Employee Master Profile</h1>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
            
            {/* Section 1: Identity & Primary Details */}
            <div className="md:col-span-2 mt-2 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Identity & Deployment</h3>
            </div>
            <InfoItem label="Employee Code" value={employee.employeeCode} />
            <InfoItem label="Employee Name" value={employee.employeeName} />
            <InfoItem label="Department" value={employee.departmentName} />
            <InfoItem label="Designation" value={employee.designationName} />
            <InfoItem label="Section" value={employee.section} />
            <InfoItem label="Status" value={employee.status} />
            <InfoItem label="Company Unit" value={employee.companyUnit} />
            <InfoItem label="Employer Name" value={employee.employerName} />
            <InfoItem label="Employment Type" value={employee.employment} />
            <InfoItem label="Source System" value={employee.sourceSystem} />

            {/* Section 2: Personal Profile */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Personal Profile</h3>
            </div>
            <InfoItem label="Gender" value={employee.gender} />
            <InfoItem label="Date Of Birth" value={formatDate(employee.dateOfBirth)} />
            <InfoItem label="Marital Status" value={employee.maritalStatus} />
            <InfoItem label="Blood Group" value={employee.bloodGroup} />
            {/* <InfoItem label="Father's Name" value={employee.fatherName} /> */}
            <InfoItem label="Guardian Name" value={employee.guardianName} />

            {/* Section 3: Contact & Communication */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Contact Details</h3>
            </div>
            <InfoItem label="Email" value={employee.email} />
            <InfoItem label="Phone" value={employee.phone} />
            <InfoItem label="Emergency Contact" value={employee.emergencyContact} />

            {/* Section 4: Tenure & Work Timeline */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Tenure & Performance</h3>
            </div>
            <InfoItem label="Date Of Joining" value={formatDate(employee.dateOfJoining)} />
            <InfoItem label="Date Of Resignation" value={formatDate(employee.dateOfResignation)} />
            <InfoItem label="Reporting Manager" value={employee.reportingManager} />
            <InfoItem label="Reason for Leaving" value={employee.leavingReason} />
            <InfoItem label="Risk Tier" value={employee.riskTier?.toString()} />
            <InfoItem label="Service Category" value={employee.serviceCategory} />

            {/* Section 5: Qualifications & Experience */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Qualifications & Profile</h3>
            </div>
            <InfoItem label="Qualification" value={employee.qualification} />
            <InfoItem label="Experience" value={employee.experience} />
            <InfoItem label="Stream" value={employee.stream} />

            {/* Section 6: Payroll & Rates */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Payroll & Compensation</h3>
            </div>
            <InfoItem label="Overtime Eligible" value={employee.overtimeEligible ? "Yes" : "No"} />
            <InfoItem label="Overtime Rate" value={employee.overtimeRate?.toString()} />
            <InfoItem label="Per Day Rate" value={employee.perDayRate?.toString()} />
            <InfoItem label="Per Hour Rate" value={employee.perHourRate?.toString()} />
            <InfoItem label="Card No" value={employee.cardNo} />

            {/* Section 7: Statutory & Verification Compliance */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Statutory & Verification</h3>
            </div>
            <InfoItem label="Aadhaar Number" value={employee.aadhaarNumber ? "[Aadhaar Redacted]" : null} />
            <InfoItem label="PAN Number" value={employee.panNumber} />
            <InfoItem label="Passport Number" value={employee.passportNumber} />
            <InfoItem label="PF Number" value={employee.pfNumber} />
            <InfoItem label="UAN Number" value={employee.uanNumber} />
            <InfoItem label="ESI Number" value={employee.esiNumber} />
            <InfoItem label="Police Verification" value={employee.policeVerification} />
            <InfoItem label="Self Declaration" value={employee.selfDeclaration} />

            {/* Section 8: Banking Information */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Bank Account Details</h3>
            </div>
            <InfoItem label="Bank Name" value={employee.bankName} />
            <InfoItem label="Account Number" value={employee.bankAccountNo} />
            <InfoItem label="IFSC Code" value={employee.bankIfsc} />

            {/* Section 9: Addresses */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Address Information</h3>
            </div>
            {/* <div className="md:col-span-2">
              <InfoItem label="General Address" value={employee.address} />
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Permanent Address" value={employee.permanentAddress} />
            </div> */}
            
            {/* Present Address Breakdown */}
            <div className="md:col-span-2 mt-2">
              <span className="text-xs font-medium text-slate-400 block mb-1">Present Address Breakdown:</span>
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Present Address Line 1" value={employee.presentAddress1} />
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Present Address Line 2" value={employee.presentAddress2} />
            </div>
            <InfoItem label="Present District" value={employee.presentDistrict} />
            <InfoItem label="Present State" value={employee.presentState} />
            <InfoItem label="Present Pincode" value={employee.presentPincode} />

            {/* Permanent Address Breakdown */}
            <div className="md:col-span-2 mt-4">
              <span className="text-xs font-medium text-slate-400 block mb-1">Permanent Address Breakdown:</span>
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Permanent Address Line 1" value={employee.permanentAddress1} />
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Permanent Address Line 2" value={employee.permanentAddress2} />
            </div>
            <InfoItem label="Permanent District" value={employee.permanentDistrict} />
            <InfoItem label="Permanent State" value={employee.permanentState} />
            <InfoItem label="Permanent Pincode" value={employee.permanentPincode} />

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex border-b py-2 text-sm">
      <span className="w-56 font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="flex-1 text-slate-800 break-all">{value || "-"}</span>
    </div>
  );
}