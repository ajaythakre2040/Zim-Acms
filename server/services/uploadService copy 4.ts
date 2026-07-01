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
  
    // Save Original
    saveToFile(DIRS.EMP_ORIGINAL, 'original', data);

    const [depList, desigList] = await Promise.all([
        db.select().from(departments),
        db.select().from(designations)
    ]);

    const depMap = new Map(depList.map(d => [d.name.toLowerCase().trim(), d.id]));
    const desigMap = new Map(desigList.map(d => [d.name.toLowerCase().trim(), d.id]));

    for (const row of data) {
        // Core validation map key ke liye
        const empCode = row.employee_code || row["Emp. ID"];
        if (!empCode) {
            errors.push({ ...row, error: "Missing employee_code / Emp. ID" });
            continue;
        }

        try {
            const departmentId = depMap.get((row.department_name || row["Department"])?.toLowerCase().trim());
            const designationId = desigMap.get((row.designation_name || row["Designation"])?.toLowerCase().trim());

            // Educational aur Professional qualification ko combine karke main table ke qualification field mein bhejna
            const eduQual = row.qualification || row["Educational Qualification"] || "";
            const profQual = row["Professional Qualification"] || "";
            const combinedQual = [eduQual, profQual].filter(Boolean).join(" + ") || null;

            let updatedPerson: any = null;

            // Database Transaction for dual-table safe execution
            await db.transaction(async (tx) => {
                // 1. Core Profile Update (people table)
                const result = await tx.update(people)
                    .set({
                        employeeName: row.employee_name || row["Employee Name"],
                        email: row.email || row["E-Mail ID"],
                        phone: row.phone || row["Mobile Number"],
                        departmentId,
                        designationId,
                        status: row.status || (row["Active"]?.toString().toLowerCase() === "yes" ? "active" : "inactive"),
                        gender: row.gender || row["Gender"],
                        dateOfBirth: parseSheetDate(row.date_of_birth || row["Date of Birth\n(dd-mmm-yyyy)"]),
                        dateOfJoining: parseSheetDate(row.date_of_joining || row["Date of Join\n(dd-mmm-yyyy)"]),
                        dateOfResignation: parseSheetDate(row.date_of_resignation || row["Leaving Date\n(dd-mmm-yyyy)"]),
                        bloodGroup: row.blood_group || row["Blood Group"],
                        panNumber: row.pan_number || row["PAN No."],
                        bankAccountNo: row.bank_account_no || row["Bank Account No."],
                        bankIfsc: row.bank_ifsc || row["IFC Code"],
                        bankName: row.bank_name || row["Bank Name"],
                        pfNumber: row.pf_number || row["UAN No."], // Mapping UAN to pfNumber or use uanNumber in additional
                        esiNumber: row.esi_number || row["ESIC No."],
                        qualification: combinedQual, // Directly inserted into people table
                        permanentAddress: row.permanent_address || row["Permanent Address-1"],
                        updatedAt: new Date()
                    })
                    .where(eq(people.employeeCode, empCode))
                    .returning();

                if (result.length === 0) {
                    throw new Error("Employee Code not found in main table");
                }

                updatedPerson = result[0];

                // 2. Extra Sheet Fields Update (people_additional_details table)
                await tx.insert(peopleAdditionalDetails)
                    .values({
                        peopleId: updatedPerson.id,
                        cardNo: row["Card No."] ? row["Card No."].toString() : null,
                        companyUnit: row["Company Unit"],
                        guardianName: row["Guardian Name"],
                        serviceCategory: row["Service Category"],
                        section: row["Section"],
                        employment: row["Employment"],
                        employerName: row["Employer Name"],
                        maritalStatus: row["Marital Status"],
                        reportingManager: row["Reporting Manager"],
                        leavingReason: row["Leaving Reason"],

                        // Present Address Breakdown
                        presentAddress1: row["Present Address-1"],
                        presentAddress2: row["Present Address-2"],
                        presentDistrict: row["Present District"],
                        presentPincode: row["Present Pincode"] ? row["Present Pincode"].toString() : null,
                        presentState: row["Present State"],

                        // Permanent Address Breakdown
                        permanentAddress1: row["Permanent Address-1"],
                        permanentAddress2: row["Permanent Address-2"],
                        permanentDistrict: row["Permanent District"],
                        permanentPincode: row["Permanent Pincode"] ? row["Permanent Pincode"].toString() : null,
                        permanentState: row["Permanent State"],

                        stream: row["Stream"],
                        perDayRate: row["Per Day Rate"] ? parseFloat(row["Per Day Rate"]) : null,
                        perHourRate: row["Per Hour Rate"] ? parseFloat(row["Per Hour Rate"]) : null,
                        uanNumber: row["UAN No."] ? row["UAN No."].toString() : null,
                        selfDeclaration: row["Self Declaration"],
                        policeVerification: row["Police Verification"],
                        authorizedDevice: row["Authorized Device"],
                        updatedAt: new Date()
                    })
                    .onConflictDoUpdate({
                        target: peopleAdditionalDetails.peopleId,
                        set: {
                            cardNo: row["Card No."] ? row["Card No."].toString() : null,
                            companyUnit: row["Company Unit"],
                            guardianName: row["Guardian Name"],
                            serviceCategory: row["Service Category"],
                            section: row["Section"],
                            employment: row["Employment"],
                            employerName: row["Employer Name"],
                            maritalStatus: row["Marital Status"],
                            reportingManager: row["Reporting Manager"],
                            leavingReason: row["Leaving Reason"],
                            presentAddress1: row["Present Address-1"],
                            presentAddress2: row["Present Address-2"],
                            presentDistrict: row["Present District"],
                            presentPincode: row["Present Pincode"] ? row["Present Pincode"].toString() : null,
                            presentState: row["Present State"],
                            permanentAddress1: row["Permanent Address-1"],
                            permanentAddress2: row["Permanent Address-2"],
                            permanentDistrict: row["Permanent District"],
                            permanentPincode: row["Permanent Pincode"] ? row["Permanent Pincode"].toString() : null,
                            permanentState: row["Permanent State"],
                            stream: row["Stream"],
                            perDayRate: row["Per Day Rate"] ? parseFloat(row["Per Day Rate"]) : null,
                            perHourRate: row["Per Hour Rate"] ? parseFloat(row["Per Hour Rate"]) : null,
                            uanNumber: row["UAN No."] ? row["UAN No."].toString() : null,
                            selfDeclaration: row["Self Declaration"],
                            policeVerification: row["Police Verification"],
                            authorizedDevice: row["Authorized Device"],
                            updatedAt: new Date()
                        }
                    });
            });

            // 3. Biometric Hardware Sync (MS SQL)
            try {
                await dbMsSql.update({ dbName: "Employees", pk: "EmployeeCode" })
                    .set(PersonAdapter.toMsSql(updatedPerson))
                    .where({ value: updatedPerson.employeeCode });

                success.push(row);
            } catch (e) {
                errors.push({ ...row, error: "MS SQL sync failed: " + (e as Error).message });
            }

        } catch (e) {
            errors.push({ ...row, error: (e as Error).message });
        }
    }

    const files: any = {};
    if (success.length > 0) files.success = `uploads/employee_details/success/${saveToFile(DIRS.EMP_SUCCESS, 'success', success)}`;
    if (errors.length > 0) files.error = `uploads/employee_details/errors/${saveToFile(DIRS.EMP_ERRORS, 'errors', errors)}`;

    return { success: true, files };
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