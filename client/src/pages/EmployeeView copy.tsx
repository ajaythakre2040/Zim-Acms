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

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 flex justify-center">
        
      <Card className="relative w-full max-w-[900px] shadow-xl">
        <div className="absolute top-4 left-4 print:hidden">
  <button
    onClick={() => window.history.back()}
    className="flex items-center gap-2 px-4 py-2 border rounded-md bg-white"
  >
    <ArrowLeft className="h-4 w-4" />
    Back
  </button>
</div>
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center border-b pb-5 mb-8">
            <h1 className="text-3xl font-bold">Employee Information</h1>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <InfoItem label="Employee Code" value={employee.employeeCode} />

            <InfoItem label="Employee Name" value={employee.employeeName} />

            <InfoItem label="Email" value={employee.email} />

            <InfoItem label="Phone" value={employee.phone} />

            <InfoItem label="Department" value={employee.departmentName} />

            <InfoItem label="Designation" value={employee.designationName} />

            <InfoItem label="Status" value={employee.status} />

            <InfoItem label="Gender" value={employee.gender} />

            <InfoItem
              label="Date Of Birth"
              value={
                employee.dateOfBirth
                  ? new Date(employee.dateOfBirth).toLocaleDateString()
                  : null
              }
            />

            <InfoItem
              label="Date Of Joining"
              value={
                employee.dateOfJoining
                  ? new Date(employee.dateOfJoining).toLocaleDateString()
                  : null
              }
            />

            <InfoItem label="Blood Group" value={employee.bloodGroup} />

            <InfoItem label="Aadhaar Number" value={employee.aadhaarNumber} />

            {/* <div className="md:col-span-2">
              <InfoItem label="Address" value={employee.address} />
            </div> */}

            <div className="md:col-span-2">
              <InfoItem
                label="Permanent Address"
                value={employee.permanentAddress}
              />
            </div>
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
    <div className="flex border-b py-2">
      <span className="w-44 font-medium text-muted-foreground">{label}</span>
      <span className="flex-1">{value || "-"}</span>
    </div>
  );
}
