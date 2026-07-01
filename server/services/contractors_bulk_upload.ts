import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { db } from "../db";
import { contractors } from "@shared/schema";
import { desc, and, eq } from "drizzle-orm";

const MEDIA_BASE = path.join(process.cwd(), 'media');

const DIRS = {
    CON_ORIGINAL: path.join(MEDIA_BASE, 'uploads/contractor_details/original'),
    CON_SUCCESS: path.join(MEDIA_BASE, 'uploads/contractor_details/success'),
    CON_ERRORS: path.join(MEDIA_BASE, 'uploads/contractor_details/errors'),
};

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

const parseInteger = (val: any) => {
    if (val === undefined || val === null || val.toString().trim() === "") return null;
    const parsed = parseInt(val.toString().trim(), 10);
    return isNaN(parsed) ? null : parsed;
};

const parseNumeric = (val: any) => {
    if (val === undefined || val === null || val.toString().trim() === "") return null;
    const parsed = parseFloat(val.toString().trim());
    return isNaN(parsed) ? null : val.toString().trim();
};

// Helper: Auto-generate Contractor Code
const generateContractorCode = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const prefix = `CON-${currentYear}-`;

    const lastContractor = await db
        .select({ contractorCode: contractors.contractorCode })
        .from(contractors)
        .orderBy(desc(contractors.id))
        .limit(1);

    let nextNumber = 1;

    if (lastContractor.length > 0 && lastContractor[0].contractorCode?.startsWith(prefix)) {
        const lastCode = lastContractor[0].contractorCode;
        const parts = lastCode.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
        }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

// --- Contractor Bulk Upload Service ---
export const processContractorBulkUploadOnly = async (data: any[]) => {
    const errors: any[] = [];
    const success: any[] = [];

    // Save Original Backup
    saveToFile(DIRS.CON_ORIGINAL, 'original', data);

    for (const rawRow of data) {
        // 🌟 STEP 1: Exact Excel Headers Mapping Layer
        // Agar user column me extra space bhi de dega to trim() use handle kar lega
        const row: any = {};
        Object.keys(rawRow).forEach((key) => {
            row[key.trim()] = rawRow[key];
        });

        // 🌟 STEP 2: Extraction using exact columns shared by you
        const agencyNameRaw = row["Name of the Agency"];
        const emailRaw = row["E-mail Adress"]; // Excel terminology maintained
        const mobileRaw = row["Contact No."];  

        // Mandatory Validations
        if (!agencyNameRaw || agencyNameRaw.toString().trim() === "") {
            errors.push({ ...rawRow, error: "Missing mandatory field: Name of the Agency" });
            continue;
        }

        if (!emailRaw || emailRaw.toString().trim() === "") {
            errors.push({ ...rawRow, error: "Missing mandatory field: E-mail Adress" });
            continue;
        }

        if (!mobileRaw || mobileRaw.toString().trim() === "") {
            errors.push({ ...rawRow, error: "Missing mandatory field: Contact No." });
            continue;
        }

        const agencyNameClean = agencyNameRaw.toString().trim();
        const emailClean = emailRaw.toString().trim();
        const mobileClean = mobileRaw.toString().trim();

        try {
            let existingContractor = [];

            // Composite Key Check
            existingContractor = await db
                .select()
                .from(contractors)
                .where(
                    and(
                        eq(contractors.nameOfTheAgency, agencyNameClean),
                        eq(contractors.emailAddress, emailClean)
                    )
                )
                .limit(1);

            // 🌟 STEP 3: Pure 31 Columns Exact Mapping According to Excel Template
            const commonPayload = {
                jobSummary: row["Job Summary"] || null,
                address1: row["Address-1"] || null,
                address2: row["Address-2"] || null,
                district: row["District"] || null,
                pincode: row["Pincode"] ? row["Pincode"].toString().trim() : null,
                state: row["State"] || null,
                
                // Numbers & Percentages parsing safely
                experienceInSimilarField: row["Experience in Similar Field"] ? row["Experience in Similar Field"].toString().trim() : null,
                commencementDate: row["Commencement Date(dd-mmm-yyyy)"] || null,
                associatedWithZimInYears: parseInteger(row["Associated with ZIM (In Years)"]),
                referenceBy: row["Reference By (Mr./Ms./Dr.)"] || null,
                
                manpowerServiceAvailableInZim: parseInteger(row["Manpower/Service Available in ZIM (As on date)"]),
                totalManpowerServiceAvailableWithTheVendor: parseInteger(row["Total Manpower/Service available with the Vendor "]),
                percentageUtilizedInZim: parseNumeric(row["%age Utilized in ZIM"]),
                workingWithOtherVendors: row["Working with Other Vendors"] || null,
                
                nameOfAgencyOwner: row["Name of Agency Owner"] || null,
                contactNoOwner: mobileClean, 
                nameOfTheRepresentative: row["Name of the Representative"] || null,
                contactNoRepresentative: row["Contact No."] || null, // Shared column mapping
                emailAddress: emailClean, 
                
                agreementFromDate: row["Agreement From Date(dd-mmm-yyyy)"] || null,
                agreementValidUpto: row["Agreement Valid Upto(dd-mmm-yyyy)"] || null,
                licenseNo: row["License No."] || null,
                licensedQuantity: parseInteger(row["Licensed Quantity"]),
                licenseValidity: row["License Validity(dd-mmm-yyyy)"] || null,
                
                gstNo: row["GST No."] || null,
                pfCodeNo: row["PF Code No."] || null,
                esicCodeNo: row["ESIC Code No."] || null,
                
                bankAccountNo: row["Bank Account No."] ? row["Bank Account No."].toString().trim() : null,
                bankName: row["Bank Name"] || null,
                ifcCode: row["IFC Code"] || null,
                status: row["Status"] ? row["Status"].toLowerCase().trim() : 'active',
            };

            let finalCode = "";

            if (existingContractor.length > 0) {
                // CASE A: UPDATE
                finalCode = existingContractor[0].contractorCode; 

                await db.update(contractors)
                    .set({
                        ...commonPayload,
                    })
                    .where(eq(contractors.id, existingContractor[0].id));
                
                success.push({ ...rawRow, generated_contractor_code: finalCode, upload_action: "UPDATED" });
            } else {
                // CASE B: INSERT
                finalCode = await generateContractorCode(); 

                await db.insert(contractors)
                    .values({
                        nameOfTheAgency: agencyNameClean,
                        contractorCode: finalCode, 
                        ...commonPayload
                    });

                success.push({ ...rawRow, generated_contractor_code: finalCode, upload_action: "INSERTED" });
            }

        } catch (e) {
            errors.push({ ...rawRow, error: "System processing error: " + (e as Error).message });
        }
    }

    const files: any = {};
    if (success.length > 0) files.success = `uploads/contractor_details/success/${saveToFile(DIRS.CON_SUCCESS, 'success', success)}`;
    if (errors.length > 0) files.error = `uploads/contractor_details/errors/${saveToFile(DIRS.CON_ERRORS, 'errors', errors)}`;

    return { success: true, files };
};