import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { db, dbMsSql } from "../db";
// Nayi table (peopleAdditionalDetails) ko import karein
import { people, peopleAdditionalDetails, employeeDoorAssignments, departments, designations, doors } from "@shared/schema";
import { eq } from "drizzle-orm";
import { PersonAdapter } from "@shared/mssql_schema";

const MEDIA_BASE = path.join(process.cwd(), 'media');

const DIRS = {
    EMP_ORIGINAL: path.join(MEDIA_BASE, 'uploads/employee_details/original'),
    EMP_SUCCESS: path.join(MEDIA_BASE, 'uploads/employee_details/success'),
    EMP_ERRORS: path.join(MEDIA_BASE, 'uploads/employee_details/errors'),

    DOOR_ORIGINAL: path.join(MEDIA_BASE, 'uploads/assign_doors/original'),
    DOOR_SUCCESS: path.join(MEDIA_BASE, 'uploads/assign_doors/success'),
    DOOR_ERRORS: path.join(MEDIA_BASE, 'uploads/assign_doors/errors'),
};

// Ensure directories exist
Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const saveToFile = (folder: string, prefix: string, data: any[]) => {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const filename = `${prefix}_${getTimestamp()}.csv`;
    const filePath = path.join(folder, filename);
    fs.writeFileSync(filePath, Papa.unparse(data));
    return filename;
};

// Helper Function: Convert "dd-mmm-yyyy" (e.g., 15-Aug-2023) to "YYYY-MM-DD"
const parseSheetDate = (dateStr: any): string | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.toString().trim();
    if (!cleanStr) return null;

    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return cleanStr; // Fallback agar standard format na ho

    return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD
};

// --- Employee Bulk Update Service (Split Table Logic) ---
export const processEmployeeBulkUpdateOnly = async (data: any[]) => {
    const errors: any[] = [];
    const success: any[] = [];

    const REQUIRED_HEADERS = [
        "Active", "Emp_ID", "Emp_Name", "Guardian_Name", "DOB", "DOJ", "Card_No",
        "Company_Unit", "Service_Category", "Department", "Section", "Designation",
        "Employment_Type", "Employer_Name", "Gender", "Marital_Status", "Per_Day_Rate",
        "Per_Hour_Rate", "Edu_Qual", "Stream", "Prof_Qual", "Exp_Years", "Present_Address1",
        "Present_Address2", "Present_District", "Present_Pincode", "Present_State",
        "Mobile_Number", "Emergency_Number", "Email_ID", "Permanent_Addr1",
        "Permanent_Addr2", "Permanent_District", "Permanent_PinPincode", "Permanent_State",
        "Blood_Group", "Self_Declaration", "Police_Verification", "UAN_No", "ESIC_No",
        "Authorized_Device", "Report_Manager", "Aadhaar_No", "PAN_No", "Bank_Acc_No",
        "Bank_Name", "IFSC_Code", "Leaving_Date", "Leaving_Reason"
    ];

    if (data.length > 0) {
        const actualHeaders = Object.keys(data[0]);
        const missing = REQUIRED_HEADERS.filter(h => !actualHeaders.includes(h.trim()));
        if (missing.length > 0) return { success: false, error: `Missing columns: ${missing.join(", ")}` };
    }

    saveToFile(DIRS.EMP_ORIGINAL, 'original', data);

    const [depList, desigList] = await Promise.all([db.select().from(departments), db.select().from(designations)]);
    const depMap = new Map(depList.map(d => [d.name.toLowerCase().trim(), d.id]));
    const desigMap = new Map(desigList.map(d => [d.name.toLowerCase().trim(), d.id]));

    for (const row of data) {
        const empCode = row["Emp_ID"]?.toString();
        if (!empCode) { errors.push({ ...row, error: "Missing Emp_ID" }); continue; }

        try {
            await db.transaction(async (tx) => {
                const res = await tx.update(people)
                    .set({
                        employeeName: row["Emp_Name"],
                        email: row["Email_ID"],
                        phone: row["Mobile_Number"],
                        emergencyContact: row["Emergency_Number"],
                        departmentId: depMap.get(row["Department"]?.toLowerCase().trim()),
                        designationId: desigMap.get(row["Designation"]?.toLowerCase().trim()),
                        status: row["Active"]?.toLowerCase() === "yes" ? "active" : "inactive",
                        gender: row["Gender"],
                        dateOfBirth: parseSheetDate(row["DOB"]),
                        dateOfJoining: parseSheetDate(row["DOJ"]),
                        dateOfResignation: parseSheetDate(row["Leaving_Date"]),
                        bloodGroup: row["Blood_Group"],
                        aadhaarNumber: row["Aadhaar_No"],
                        panNumber: row["PAN_No"],
                        bankAccountNo: row["Bank_Acc_No"],
                        bankIfsc: row["IFSC_Code"],
                        bankName: row["Bank_Name"],
                        pfNumber: row["UAN_No"],
                        esiNumber: row["ESIC_No"],
                        experience: row["Exp_Years"],
                        educational_qual: row["Edu_Qual"],
                        professional_qual: row["Prof_Qual"],
                        // permanentAddress: row["Permanent_Addr1"],
                        updatedAt: new Date()
                    })
                    .where(eq(people.employeeCode, empCode))
                    .returning();

                if (res.length === 0) throw new Error("Employee not found");

                const updateOnlyData = {
                    cardNo: row["Card_No"]?.toString(),
                    companyUnit: row["Company_Unit"],
                    guardianName: row["Guardian_Name"],
                    serviceCategory: row["Service_Category"],
                    section: row["Section"],
                    employment: row["Employment_Type"],
                    employerName: row["Employer_Name"],
                    maritalStatus: row["Marital_Status"],
                    reportingManager: row["Report_Manager"],
                    leavingReason: row["Leaving_Reason"],
                    presentAddress1: row["Present_Address1"],
                    presentAddress2: row["Present_Address2"],
                    presentDistrict: row["Present_District"],
                    presentPincode: row["Present_Pincode"]?.toString(),
                    presentState: row["Present_State"],
                    permanentAddress1: row["Permanent_Addr1"],
                    permanentAddress2: row["Permanent_Addr2"],
                    permanentDistrict: row["Permanent_District"],
                    permanentPincode: row["Permanent_PinPincode"]?.toString(),
                    permanentState: row["Permanent_State"],
                    stream: row["Stream"],
                    perDayRate: row["Per_Day_Rate"] ? parseFloat(row["Per_Day_Rate"]) : null,
                    perHourRate: row["Per_Hour_Rate"] ? parseFloat(row["Per_Hour_Rate"]) : null,
                    uanNumber: row["UAN_No"]?.toString(),
                    selfDeclaration: row["Self_Declaration"],
                    policeVerification: row["Police_Verification"],
                    authorizedDevice: row["Authorized_Device"],
                    updatedAt: new Date()
                };

                await tx.insert(peopleAdditionalDetails)
                    .values({
                        employeeCode: empCode,
                        ...updateOnlyData
                    })
                    .onConflictDoUpdate({
                        target: peopleAdditionalDetails.employeeCode,
                        set: updateOnlyData
                    });

                await dbMsSql.update({ dbName: "Employees", pk: "EmployeeCode" })
                    .set(PersonAdapter.toMsSql(res[0]))
                    .where({ value: empCode });
            });
            success.push(row);
        } catch (e: any) {
            errors.push({ ...row, error: e.message });
        }
    }

    return {
        success: true,
        files: {
            success: success.length ? `uploads/employee_details/success/${saveToFile(DIRS.EMP_SUCCESS, 'success', success)}` : null,
            error: errors.length ? `uploads/employee_details/errors/${saveToFile(DIRS.EMP_ERRORS, 'errors', errors)}` : null
        }
    };
};
// --- Door Assignment Service ---
export const processDoorUpdate = async (data: any[]) => {
    const errors: any[] = [];
    const success: any[] = [];

    saveToFile(DIRS.DOOR_ORIGINAL, 'original', data);

    const doorsList = await db.select().from(doors);
    const doorMap = new Map(doorsList.map(d => [d.name.toLowerCase().trim(), d.id]));

    for (const row of data) {
        try {
            const empCode = row.employee_code || row.employee || row["Emp. ID"];
            if (!empCode) {
                throw new Error("Missing employee_code");
            }

            const doorField = row.door_names || row["Authorized Device"];
            if (!doorField) {
                throw new Error("Missing door_names or Authorized Device");
            }

            const doorNames = doorField.toString().split(',').map((n: string) => n.trim());
            const doorIds: number[] = [];

            for (const name of doorNames) {
                const id = doorMap.get(name.toLowerCase());
                if (id) {
                    doorIds.push(id);
                } else {
                    throw new Error(`Door not found: ${name}`);
                }
            }

            await db.insert(employeeDoorAssignments)
                .values({
                    employeeCode: empCode,
                    doorIds,
                    updatedAt: new Date()
                })
                .onConflictDoUpdate({
                    target: employeeDoorAssignments.employeeCode,
                    set: { doorIds, updatedAt: new Date() }
                });

            success.push(row);
        } catch (e) {
            errors.push({
                ...row,
                error: (e as Error).message
            });
        }
    }

    const files: any = {};
    if (success.length > 0) files.success = `uploads/assign_doors/success/${saveToFile(DIRS.DOOR_SUCCESS, 'success', success)}`;
    if (errors.length > 0) files.error = `uploads/assign_doors/errors/${saveToFile(DIRS.DOOR_ERRORS, 'errors', errors)}`;

    return { success: true, files };
};