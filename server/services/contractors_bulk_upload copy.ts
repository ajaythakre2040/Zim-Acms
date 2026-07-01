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

    for (const row of data) {
        // 1. Mandatory Field Validations (Name, Email, Mobile)
        const agencyNameRaw = row.name_of_the_agency;
        const emailRaw = row.email_address;
        
        // Aapke Excel ke column name ke hisab se ise badal sakte hain (e.g., row.mobile_no ya row.contact_no_owner)
        const mobileRaw = row.contact_no_owner; 

        // Check if Agency Name is empty
        if (!agencyNameRaw || agencyNameRaw.toString().trim() === "") {
            errors.push({ ...row, error: "Missing mandatory field: name_of_the_agency" });
            continue;
        }

        // Check if Email is empty
        if (!emailRaw || emailRaw.toString().trim() === "") {
            errors.push({ ...row, error: "Missing mandatory field: email_address" });
            continue;
        }

        // Check if Mobile Number is empty
        if (!mobileRaw || mobileRaw.toString().trim() === "") {
            errors.push({ ...row, error: "Missing mandatory field: contact_no_owner (Mobile)" });
            continue;
        }

        const agencyNameClean = agencyNameRaw.toString().trim();
        const emailClean = emailRaw.toString().trim();
        const mobileClean = mobileRaw.toString().trim();

        try {
            let existingContractor = [];

            // 2. Composite Key Check (Ab kyuki email hamesha mandatory hai, direct and check lagega)
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

            const commonPayload = {
                jobSummary: row.job_summary || null,
                address1: row.address_1 || null,
                address2: row.address_2 || null,
                district: row.district || null,
                pincode: row.pincode || null,
                state: row.state || null,
                experienceInSimilarField: row.experience_in_similar_field || null,
                commencementDate: row.commencement_date || null,
                associatedWithZimInYears: parseInteger(row.associated_with_zim_in_years),
                referenceBy: row.reference_by || null,
                manpowerServiceAvailableInZim: parseInteger(row.manpower_service_available_in_zim),
                totalManpowerServiceAvailableWithTheVendor: parseInteger(row.total_manpower_service_available_with_the_vendor),
                percentageUtilizedInZim: parseNumeric(row.percentage_utilized_in_zim),
                workingWithOtherVendors: row.working_with_other_vendors || null,
                nameOfAgencyOwner: row.name_of_agency_owner || null,
                contactNoOwner: mobileClean, // cleaned mobile number here
                nameOfTheRepresentative: row.name_of_the_representative || null,
                contactNoRepresentative: row.contact_no_representative || null,
                emailAddress: emailClean, // cleaned email here
                agreementFromDate: row.agreement_from_date || null,
                agreementValidUpto: row.agreement_valid_upto || null,
                licenseNo: row.license_no || null,
                licensedQuantity: parseInteger(row.licensed_quantity),
                licenseValidity: row.license_validity || null,
                gstNo: row.gst_no || null,
                pfCodeNo: row.pf_code_no || null,
                esicCodeNo: row.esic_code_no || null,
                bankAccountNo: row.bank_account_no || null,
                bankName: row.bank_name || null,
                ifcCode: row.ifc_code || null,
                status: row.status ? row.status.toLowerCase().trim() : 'active',
            };

            let finalCode = "";

            if (existingContractor.length > 0) {
                // ➡️ CASE A: Match Found! UPDATE existing record
                finalCode = existingContractor[0].contractorCode; 

                await db.update(contractors)
                    .set({
                        ...commonPayload,
                    })
                    .where(eq(contractors.id, existingContractor[0].id));
                
                success.push({ ...row, generated_contractor_code: finalCode, upload_action: "UPDATED" });
            } else {
                // ➡️ CASE B: No Match! INSERT new record
                finalCode = await generateContractorCode(); 

                await db.insert(contractors)
                    .values({
                        nameOfTheAgency: agencyNameClean,
                        contractorCode: finalCode, // Code automatic generate ho rha h mandatory h
                        ...commonPayload
                    });

                success.push({ ...row, generated_contractor_code: finalCode, upload_action: "INSERTED" });
            }

        } catch (e) {
            errors.push({ ...row, error: "System processing error: " + (e as Error).message });
        }
    }

    const files: any = {};
    if (success.length > 0) files.success = `uploads/contractor_details/success/${saveToFile(DIRS.CON_SUCCESS, 'success', success)}`;
    if (errors.length > 0) files.error = `uploads/contractor_details/errors/${saveToFile(DIRS.CON_ERRORS, 'errors', errors)}`;

    return { success: true, files };
};