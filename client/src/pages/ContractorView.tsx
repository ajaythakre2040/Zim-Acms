import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ContractorView() {
  const [, params] = useRoute("/contractors/view/:id");
  const [, navigate] = useLocation();
  const id = params?.id;

  const {
    data: contractor,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["contractor", id],
    queryFn: async () => {
      const response = await fetch(`/api/contractors/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch contractor details");
      }

      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading contractor details...
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Contractor not found
      </div>
    );
  }

  // Date formatted helper function
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
            <h1 className="text-3xl font-bold text-[#5c54d5]">Contractor Master Profile</h1>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
            
            {/* Section 1: Agency & System Keys */}
            <div className="md:col-span-2 mt-2 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Agency & Identity Details</h3>
            </div>
            <InfoItem label="Contractor Code" value={contractor.contractorCode} />
            <InfoItem label="Name of the Agency" value={contractor.nameOfTheAgency || contractor.companyName} />
            <InfoItem label="License No" value={contractor.licenseNo} />
            <InfoItem label="Licensed Quantity" value={contractor.licensedQuantity?.toString()} />
            <InfoItem label="License Validity" value={formatDate(contractor.licenseValidity)} />
            <InfoItem label="Status" value={contractor.status} />

            {/* Section 2: Owner & Representative Details */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Contact & Ownership</h3>
            </div>
            <InfoItem label="Owner Name" value={contractor.nameOfAgencyOwner || contractor.contractorName} />
            <InfoItem label="Owner Contact No" value={contractor.contactNoOwner || contractor.contactNumber} />
            <InfoItem label="Email Address" value={contractor.emailAddress || contractor.email} />
            <InfoItem label="Representative Name" value={contractor.nameOfTheRepresentative} />
            <InfoItem label="Representative Contact" value={contractor.contactNoRepresentative} />

            {/* Section 3: Agreement & Timeline */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Agreement Timeline & History</h3>
            </div>
            <InfoItem label="Commencement Date" value={formatDate(contractor.commencementDate)} />
            <InfoItem label="Agreement From" value={formatDate(contractor.agreementFromDate || contractor.startDate)} />
            <InfoItem label="Agreement Valid Upto" value={formatDate(contractor.agreementValidUpto || contractor.expiryDate)} />
            <InfoItem label="Experience (Years)" value={contractor.experienceInSimilarField} />
            <InfoItem label="Associated with Zim (Yrs)" value={contractor.associatedWithZimInYears?.toString()} />
            <InfoItem label="Reference By" value={contractor.referenceBy} />

            {/* Section 4: Manpower Metrics */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Manpower & Capacity Metrics</h3>
            </div>
            <InfoItem label="Manpower In Zim" value={contractor.manpowerServiceAvailableInZim?.toString()} />
            <InfoItem label="Total Vendor Manpower" value={contractor.totalManpowerServiceAvailableWithTheVendor?.toString()} />
            <InfoItem label="Percentage Utilized In Zim" value={contractor.percentageUtilizedInZim ? `${contractor.percentageUtilizedInZim}%` : null} />
            <InfoItem label="Working with Other Vendors" value={contractor.workingWithOtherVendors} />

            {/* Section 5: Statutory & Compliance (GST, PF, ESIC) */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Statutory & Compliance Codes</h3>
            </div>
            <InfoItem label="GST Number" value={contractor.gstNo} />
            <InfoItem label="PF Code Number" value={contractor.pfCodeNo} />
            <InfoItem label="ESIC Code Number" value={contractor.esicCodeNo} />

            {/* Section 6: Banking Information */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Bank Account Details</h3>
            </div>
            <InfoItem label="Bank Name" value={contractor.bankName} />
            <InfoItem label="Account Number" value={contractor.bankAccountNo} />
            <InfoItem label="IFSC Code" value={contractor.ifcCode} />

            {/* Section 7: Text Summaries & Addresses (Full Width) */}
            <div className="md:col-span-2 mt-6 mb-1">
              <h3 className="text-sm font-semibold text-[#5c54d5] uppercase tracking-wider">Job Summary & Addresses</h3>
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Job Summary" value={contractor.jobSummary} />
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Address Line 1" value={contractor.address1 || contractor.address} />
            </div>
            <div className="md:col-span-2">
              <InfoItem label="Address Line 2" value={contractor.address2} />
            </div>
            
            {/* Location Group */}
            <InfoItem label="District" value={contractor.district} />
            <InfoItem label="State" value={contractor.state} />
            <InfoItem label="Pincode" value={contractor.pincode} />

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