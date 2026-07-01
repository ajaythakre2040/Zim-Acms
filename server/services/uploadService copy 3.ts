import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { db, dbMsSql } from "../db";
import { people, employeeDoorAssignments, departments, designations, doors } from "@shared/schema";
import { eq } from "drizzle-orm";
import { PersonAdapter } from "@shared/mssql_schema";

const MEDIA_BASE = path.join(process.cwd(), 'media');

// 1. Updated Directory Structure
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

// Helper: Standardized Timestamp
const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// Helper: Save to File
const saveToFile = (folder: string, prefix: string, data: any[]) => {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const filename = `${prefix}_${getTimestamp()}.csv`;
    const filePath = path.join(folder, filename);
    fs.writeFileSync(filePath, Papa.unparse(data));
    return filename;
};

// --- Employee Bulk Update Service ---
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
                    aadhaarNumber: '[REDACTED]',
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
            try {
                await dbMsSql.update({ dbName: "Employees", pk: "EmployeeCode" })
                    .set(PersonAdapter.toMsSql(updated))
                    .where({ value: updated.employeeCode });

                success.push(row);
            } catch (e) {
                errors.push({ ...row, error: "MS SQL sync failed: " + (e as Error).message });
            }
        } catch (e) {
            errors.push({ ...row, error: "System error: " + (e as Error).message });
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

    // Save Original
    saveToFile(DIRS.DOOR_ORIGINAL, 'original', data);

    const doorsList = await db.select().from(doors);
    const doorMap = new Map(doorsList.map(d => [d.name.toLowerCase().trim(), d.id]));

    for (const row of data) {
        try {
            // 1. Validation: Check if employee_code exists
            const empCode = row.employee_code || row.employee; // Fallback
            if (!empCode) {
                throw new Error("Missing employee_code");
            }

            // 2. Validation: Check if door_names exists
            if (!row.door_names) {
                throw new Error("Missing door_names");
            }

            const doorNames = row.door_names.toString().split(',').map((n: string) => n.trim());
            const doorIds: number[] = [];

            // 3. Match Doors
            for (const name of doorNames) {
                const id = doorMap.get(name.toLowerCase());
                if (id) {
                    doorIds.push(id);
                } else {
                    // Ye error seedha error file mein jayega
                    throw new Error(`Door not found: ${name}`);
                }
            }

            // 4. DB Operation
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
            // Error log mein clean message store karein
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