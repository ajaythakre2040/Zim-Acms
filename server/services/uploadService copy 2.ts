import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { db, dbMsSql } from "../db";
import { people, employeeDoorAssignments, departments, designations, doors } from "@shared/schema";
import { eq } from "drizzle-orm";
import { PersonAdapter } from "@shared/mssql_schema";

const MEDIA_BASE = path.join(process.cwd(), 'media');
const DIRS = {
    DETAILS_UPLOADS: path.join(MEDIA_BASE, 'uploads/emplyee_details'),
    DOORS_UPLOADS: path.join(MEDIA_BASE, 'uploads/asign_doors'),
    DETAILS_ERRORS: path.join(MEDIA_BASE, 'errors/emplyee_details'),
    DOORS_ERRORS: path.join(MEDIA_BASE, 'errors/asign_doors'),
};

// Ensure directories exist
Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper: Standardized Timestamp for file naming
const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const saveToFile = (folder: string, prefix: string, data: any) => {
    const filename = `${prefix}_${getTimestamp()}.csv`;
    fs.writeFileSync(path.join(folder, filename), Papa.unparse(data));
    return filename;
};

// --- Employee Bulk Update Service ---
export const processEmployeeBulkUpdateOnly = async (data: any[]) => {
    const errors: any[] = [];
    saveToFile(DIRS.DETAILS_UPLOADS, 'upload', data);

    const [depList, desigList] = await Promise.all([
        db.select().from(departments),
        db.select().from(designations)
    ]);

    const depMap = new Map(depList.map(d => [d.name.toLowerCase().trim(), d.id]));
    const desigMap = new Map(desigList.map(d => [d.name.toLowerCase().trim(), d.id]));

    for (const row of data) {
        if (!row.employee_code) {
            errors.push({ ...row, error: "Missing employee_code" });
            continue;
        }

        try {
            const departmentId = depMap.get(row.department_name?.toLowerCase().trim());
            const designationId = desigMap.get(row.designation_name?.toLowerCase().trim());

            const result = await db.update(people)
                .set({
                    employeeName: row.employee_name,
                    email: row.email,
                    phone: row.phone,
                    departmentId,
                    designationId,
                    status: row.status,
                    gender: row.gender,
                    dateOfBirth: row.date_of_birth,
                    dateOfJoining: row.date_of_joining,
                    bloodGroup: row.blood_group,
                    aadhaarNumber: '[REDACTED]', // Security: Never persist raw PII from upload
                    panNumber: row.pan_number,
                    bankAccountNo: row.bank_account_no,
                    bankIfsc: row.bank_ifsc,
                    bankName: row.bank_name,
                    pfNumber: row.pf_number,
                    esiNumber: row.esi_number,
                    qualification: row.qualification,
                    permanentAddress: row.permanent_address,
                    updatedAt: new Date()
                })
                .where(eq(people.employeeCode, row.employee_code))
                .returning();

            if (result.length === 0) {
                errors.push({ ...row, error: "Employee Code not found" });
                continue;
            }

            const updated = result[0];
            if (updated?.employeeCode) {
                try {
                    await dbMsSql.update({ dbName: "Employees", pk: "EmployeeCode" })
                        .set(PersonAdapter.toMsSql(updated))
                        .where({ value: updated.employeeCode });
                } catch (e) {
                    errors.push({ ...row, error: "MS SQL sync failed: " + (e as Error).message });
                }
            }
        } catch (e) {
            errors.push({ ...row, error: "System error: " + (e as Error).message });
        }
    }

    if (errors.length > 0) {
        const fileName = saveToFile(DIRS.DETAILS_ERRORS, 'errors', errors);
        return { errorFile: `errors/emplyee_details/${fileName}` };
    }
    return { success: true };
};

// --- Door Assignment Service ---
export const processDoorUpdate = async (data: any[]) => {
    const errors: any[] = [];
    saveToFile(DIRS.DOORS_UPLOADS, 'upload', data);

    const doorsList = await db.select().from(doors);
    const doorMap = new Map(doorsList.map(d => [d.name.toLowerCase().trim(), d.id]));

    for (const row of data) {
        try {
            const doorNames = row.door_names ? row.door_names.toString().split(',').map((n: string) => n.trim()) : [];
            const doorIds: number[] = [];

            for (const name of doorNames) {
                const id = doorMap.get(name.toLowerCase());
                if (id) doorIds.push(id);
                else throw new Error(`Door not found: ${name}`);
            }

            await db.insert(employeeDoorAssignments)
                .values({
                    employeeCode: row.employee_code,
                    doorIds,
                    updatedAt: new Date()
                })
                .onConflictDoUpdate({
                    target: employeeDoorAssignments.employeeCode,
                    set: { doorIds, updatedAt: new Date() }
                });
        } catch (e) {
            errors.push({ ...row, error: "Database operation failed: " + (e as Error).message });
        }
    }

    if (errors.length > 0) {
        const fileName = saveToFile(DIRS.DOORS_ERRORS, 'errors', errors);
        return { errorFile: `errors/asign_doors/${fileName}` };
    }
    return { success: true };
};