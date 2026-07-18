import { TableNames, TABLES } from "../constant";
import { db } from "../db";
import { storage } from "../storage";
import { sql } from "drizzle-orm";

// 🛠️ Generic function jo direct table string se record nikalega (Intact & Original)
const getRecordByField = async (tableName: string, fieldName: string, value: any) => {
    try {
        const query = sql`SELECT * FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(fieldName)} = ${value} LIMIT 1`;
        const result = await db.execute(query);
        return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
        console.error(`Generic fetch failed for table ${tableName}:`, err);
        return null;
    }
};

// 🔍 Reusable utility to find exactly which columns changed
const getChangedFields = (oldData: any, newData: any): string[] => {
    if (!oldData || !newData) return [];

    const changedFields: string[] = [];

    // Normalise keys helper: snake_case ko camelCase me convert karne ke liye
    const toCamel = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

    // Dono objects ke saare data ko standard camelCase keys me map kar lete hain
    const normalizeObject = (obj: any) => {
        const normalized: any = {};
        for (const key of Object.keys(obj)) {
            const camelKey = toCamel(key);
            normalized[camelKey] = obj[key];
        }
        return normalized;
    };

    const cleanOld = normalizeObject(oldData);
    const cleanNew = normalizeObject(newData);

    const allKeys = Array.from(new Set([...Object.keys(cleanOld), ...Object.keys(cleanNew)]));

    for (const key of allKeys) {
        // Ignored system fields
        if (key === "updatedAt" || key === "password" || key === "createdAt") {
            continue;
        }

        const oldVal = cleanOld[key];
        const newVal = cleanNew[key];

        // Agar dono me se ek field absent hai (matlab nayi jodi gayi ya delete hui)
        if (oldVal === undefined || newVal === undefined) {
            changedFields.push(key);
            continue;
        }

        // Date comparison
        if (oldVal instanceof Date && newVal instanceof Date) {
            if (oldVal.getTime() !== newVal.getTime()) {
                changedFields.push(key);
            }
        }
        // Normal value string/number/null comparison
        else if (String(oldVal) !== String(newVal)) {
            changedFields.push(key);
        }
    }

    return changedFields;
};
// 🛡️ Main Generic Middleware Wrapper (Your Original Logic + Dynamic Column Audit)
// export const withAudit = (
//     tableName: TableNames,
//     // action: "ADD" | "UPDATE" | "DELETE" | "ADD/UPDATE" | "EMERGENCY_BLOCK" | "EMERGENCY_UNBLOCK" |"EMERGENCY_UNBLOCK_ALL",
//     action: "ADD" | "UPDATE" | "DELETE" | "ADD/UPDATE" | "EMERGENCY_BLOCK" | "EMERGENCY_UNBLOCK" | "EMERGENCY_UNBLOCK_ALL" | ((req: any) => string),  storageOperation: (req: any) => Promise<any>,
//     statusCode = 200
// ) => {
//     return async (req: any, res: any) => {
//         try {
//             // 1. Session user authentication details
//             const userId = req.session?.userId || req.user?.id || "system";
//             const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
//             const userAgent = req.headers["user-agent"] || null;
//             const rawId = req.params.id;
//             let oldData: any = null;

//             // 2. UPDATE / DELETE ke liye automatic internal GET call (Original Logic)
//             if ((action === "UPDATE" || action === "DELETE") && rawId) {
//                 const queryParam = isNaN(Number(rawId)) ? rawId : parseInt(rawId, 10);

//                 // user_profiles me string ID aane par user_id check karega, baki sab me standard id
//                 const filterColumn = (tableName === "user_profiles" && isNaN(Number(rawId))) ? "user_id" : "id";

//                 oldData = await getRecordByField(tableName, filterColumn, queryParam);
//             }

//             // 3. Actual Storage Query/Operation Run Karo (Original Logic)
//             const result = await storageOperation(req);
//             const recordId = result?.id || result?.userId || rawId || "N/A";

//             const finalNewData = action === "DELETE" ? null : result;

//             // Multiple changed columns detect karne ke liye helper call kiya
//             const changedColumns = action === "UPDATE" ? getChangedFields(oldData, finalNewData) : [];


//             storage.logAudit(db, {
//                 userId: String(userId),
//                 tableName,
//                 recordId: String(recordId),
//                 action,
//                 oldData,
//                 newData: finalNewData,
//                 changedColumns: changedColumns.length > 0 ? changedColumns.join(", ") : null,
//                 ipAddress: typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : String(ipAddress), // Proxy handling
//                 userAgent: userAgent
//             });

//             // 5. Response handling (Original Logic)
//             if (statusCode === 204) {
//                 return res.sendStatus(204);
//             } else {
//                 return res.status(statusCode).json(result);
//             }
//         } catch (e: any) {
//             console.error(`Audit API Error [${action} on ${tableName}]:`, e);
//             return res.status(500).json({ message: e.message || "Failed to process request" });
//         }
//     };
// };
export const withAudit = (
    tableName: TableNames,
    action: "ADD" | "UPDATE" | "DELETE" | "ADD/UPDATE" | "EMERGENCY_BLOCK" | "EMERGENCY_UNBLOCK" |"EMERGENCY_BLOCK_ALL"| "EMERGENCY_UNBLOCK_ALL" | "BULK_EMPOYEE_UPDATE" | "BULK_DOOR_ASIGNMENT" | "BULK_CONTRACTOR_UPLOAD" |((req: any) => string),
    storageOperation: (req: any) => Promise<any>,
    statusCode = 200
) => {
    return async (req: any, res: any) => {
        try {
            const userId = req.session?.userId || req.user?.id || "system";
            const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
            const userAgent = req.headers["user-agent"] || null;
            const rawId = req.params.id;
            let oldData: any = null;

            if ((action === "UPDATE" || action === "DELETE") && rawId) {
                const queryParam = isNaN(Number(rawId)) ? rawId : parseInt(rawId, 10);
                const filterColumn = (tableName === "user_profiles" && isNaN(Number(rawId))) ? "user_id" : "id";
                oldData = await getRecordByField(tableName, filterColumn, queryParam);
            }

            const result = await storageOperation(req);
            // Middleware mein:
            const recordId =
                action === "BULK_EMPOYEE_UPDATE" ? "MULTIPLE_EMPLOYEES" :
                    action === "BULK_DOOR_ASIGNMENT" ? "MULTIPLE_DOOR_ASSIGNMENTS" :
                        (result?.id || result?.userId || result?.data?.id || result?.data?.employeeCode || rawId || "N/A");
            // const recordId = result?.id || result?.userId || result?.data?.id || result?.data?.employeeCode || rawId || "N/A";
            const finalNewData = action === "DELETE" ? null : result;
            const changedColumns = action === "UPDATE" ? getChangedFields(oldData, finalNewData) : [];
            const finalAction = typeof action === "function" ? action(req) : action;

            storage.logAudit(db, {
                userId: String(userId),
                tableName,
                recordId: String(recordId),
                action: finalAction,
                oldData,
                newData: finalNewData,
                changedColumns: changedColumns.length > 0 ? changedColumns.join(", ") : null,
                ipAddress: typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : String(ipAddress),
                userAgent: userAgent
            });

            if (statusCode === 204) {
                return res.sendStatus(204);
            } else {
                return res.status(statusCode).json(result);
            }
        } catch (e: any) {
            if (e.isCustom) {
                return res.status(e.status).json({ errors: e.errors });
            }
            const fallbackAction = typeof action === "function" ? "DYNAMIC_ACTION_FAILED" : action;
            console.error(`Audit API Error [${fallbackAction} on ${tableName}]:`, e);
            return res.status(500).json({ message: e.message || "Failed to process request" });
        }
    };
};
// 🛠️ Independent Profile Audit Helper (Chupchaap background me call hoga)
export const logProfileAudit = async (
    req: any,
    action: "ADD" | "UPDATE" | "DELETE",
    targetUserId: string,
    passedOldData: any = null, // 👈 Naya parameter
    passedNewData: any = null  // 👈 Naya parameter
) => {
    try {
        const userId = req.session?.userId || req.user?.id || "system";
        const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
        const userAgent = req.headers["user-agent"] || null;
        let oldProfile = passedOldData;
        let newProfile = passedNewData;

        // Agar parameters nahi bheje gaye (jaise ADD ya DELETE ke waqt), toh khud fetch karega
        if (!oldProfile || !newProfile) {
            const query = sql`SELECT * FROM user_profiles WHERE user_id = ${targetUserId} LIMIT 1`;
            const result = await db.execute(query);
            const fetchedProfile = result.rows && result.rows.length > 0 ? result.rows[0] : null;

            if (action === "DELETE") oldProfile = fetchedProfile;
            if (action === "ADD") newProfile = fetchedProfile;
        }

        if (oldProfile || newProfile || action === "DELETE") {
            const recordId = oldProfile?.id || newProfile?.id || "N/A";

            const finalOldData = action === "DELETE" ? oldProfile : (action === "ADD" ? null : oldProfile);
            const finalNewData = action === "DELETE" ? null : (action === "ADD" ? oldProfile : newProfile);

            // Ab explicit data milne par calculation 100% accurate hogi
            const changedColumns = action === "UPDATE" ? getChangedFields(finalOldData, finalNewData) : [];

            storage.logAudit(db, {
                userId: String(userId),
                tableName: TABLES.USER_PROFILES,
                recordId: String(recordId),
                action,
                oldData: finalOldData,
                newData: finalNewData,
                changedColumns: changedColumns.length > 0 ? changedColumns.join(", ") : null,
                ipAddress: typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : String(ipAddress),
                userAgent: userAgent
            });
        }
    } catch (err) {
        console.error("Error inside logProfileAudit helper:", err);
    }
};