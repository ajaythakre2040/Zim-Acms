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

// Updated Helper: Database me numeric column ke liye % sign strip karne ke liye
const parseNumeric = (val: any) => {
    if (val === undefined || val === null || val.toString().trim() === "") return null;
    // Agar string me '%' ka sign hai to use hata do taaki numeric parse ho sake
    const cleanVal = val.toString().replace(/%/g, '').trim();
    const parsed = parseFloat(cleanVal);
    return isNaN(parsed) ? null : cleanVal;
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
    // 🌟 1. CONTRACTOR HEADER VALIDATION
    // 🌟 1. CONTRACTOR HEADER VALIDATION
    const REQUIRED_CONTRACTOR_HEADERS = [
        "Name_of_the_Agency", "Job_Summary", "Address-1", "Address-2", "District",
        "Pincode", "State", "Experience_in_Similar_Field", "Commencement_Date",
        "Associated_with_ZIM_(In Years)", "Reference_By", "Manpower/Service_Available_in_ZIM",
        "Total_Manpower/Service_available_with_Vendor", "%age_Utilized_in_ZIM",
        "Working_with_Other_Vendors", "Name_of_Agency_Owner", "Contact_of_Owner",
        "Name_of_the_Representative", "Contact_of_Representative", "E-mail",
        "Agreement_From_Date", "Agreement_Valid_Upto", "License_No",
        "Licensed_Quantity", "License_Validity", "GST_No", "PF_Code_No",
        "ESIC_Code_No", "Bank_Account_No", "Bank_Name", "IFC_Code"
    ];

    if (data.length > 0) {
        const actualHeaders = Object.keys(data[0]).map(h => h.trim());
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Debugging ke liye check karein
        console.log("Required (Normalized):", REQUIRED_CONTRACTOR_HEADERS.map(normalize));
        console.log("Actual (Normalized):", actualHeaders.map(normalize));

        const missing = REQUIRED_CONTRACTOR_HEADERS.filter(reqHeader => {
            const normalizedReq = normalize(reqHeader);
            // Is line ko debug karein: kya koi match mil raha hai?
            const isMatch = actualHeaders.some(actHeader => normalize(actHeader) === normalizedReq);
            return !isMatch;
        });

        if (missing.length > 0) {
            // Yeh line trigger honi chahiye!
            console.log("Validation Failed! Missing list:", missing);

            return {
                success: false,
                error: `Header Error! Required columns missing: ${missing.join(", ")}`
            };
        }
    }
    // Save Original Backup
    saveToFile(DIRS.CON_ORIGINAL, 'original', data);

    for (const rawRow of data) {
        // 🌟 STEP 1: Exact Excel Headers Mapping Layer
        // Handles any extra spaces in header keys gracefully
        const row: any = {};
        Object.keys(rawRow).forEach((key) => {
            row[key.trim()] = rawRow[key];
        });

        // 🌟 STEP 2: Extraction using updated template columns
        const agencyNameRaw = row["Name_of_the_Agency"];
        const emailRaw = row["E-mail"]; 
        const mobileOwnerRaw = row["Contact_of_Owner"];  

        // Mandatory Validations
        if (!agencyNameRaw || agencyNameRaw.toString().trim() === "") {
            errors.push({ ...rawRow, error: "Missing mandatory field: Name_of_the_Agency" });
            continue;
        }

        if (!emailRaw || emailRaw.toString().trim() === "") {
            errors.push({ ...rawRow, error: "Missing mandatory field: E-mail" });
            continue;
        }

        if (!mobileOwnerRaw || mobileOwnerRaw.toString().trim() === "") {
            errors.push({ ...rawRow, error: "Missing mandatory field: Contact_of_Owner" });
            continue;
        }

        const agencyNameClean = agencyNameRaw.toString().trim();
        const emailClean = emailRaw.toString().trim();
        const mobileOwnerClean = mobileOwnerRaw.toString().trim();

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

            // 🌟 STEP 3: Pure Columns Exact Mapping According to NEW Template
            const commonPayload = {
                jobSummary: row["Job_Summary"] || null,
                address1: row["Address-1"] || null,
                address2: row["Address-2"] || null,
                district: row["District"] || null,
                pincode: row["Pincode"] ? row["Pincode"].toString().trim() : null,
                state: row["State"] || null,
                
                // Numbers & Percentages parsing safely with new headers
                experienceInSimilarField: row["Experience_in_Similar_Field"] ? row["Experience_in_Similar_Field"].toString().trim() : null,
                commencementDate: row["Commencement_Date"] || null,
                associatedWithZimInYears: parseInteger(row["Associated_with_ZIM_(In Years)"]),
                referenceBy: row["Reference_By"] || null,
                
                manpowerServiceAvailableInZim: parseInteger(row["Manpower/Service_Available_in_ZIM"]),
                // Schema match mapping for totalManpowerServiceAvailableWithTheVendor
                totalManpowerServiceAvailableWithTheVendor: parseInteger(row["Total_Manpower/Service_available_with_Vendor"]),
                // Fixed percentage parsing
                percentageUtilizedInZim: parseNumeric(row["%age_Utilized_in_ZIM"]),
                workingWithOtherVendors: row["Working_with_Other_Vendors"] || null,
                
                nameOfAgencyOwner: row["Name_of_Agency_Owner"] || null,
                contactNoOwner: mobileOwnerClean, 
                nameOfTheRepresentative: row["Name_of_the_Representative"] || null,
                contactNoRepresentative: row["Contact_of_Representative"] || null, 
                emailAddress: emailClean, 
                
                agreementFromDate: row["Agreement_From_Date"] || null,
                agreementValidUpto: row["Agreement_Valid_Upto"] || null,
                licenseNo: row["License_No"] || null,
                licensedQuantity: parseInteger(row["Licensed_Quantity"]),
                licenseValidity: row["License_Validity"] || null,
                
                gstNo: row["GST_No"] || null,
                pfCodeNo: row["PF_Code_No"] || null,
                esicCodeNo: row["ESIC_Code_No"] || null,
                
                bankAccountNo: row["Bank_Account_No"] ? row["Bank_Account_No"].toString().trim() : null,
                bankName: row["Bank_Name"] || null,
                ifcCode: row["IFC_Code"] || null,
                // Fallback for status field since it's removed from new template headers
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