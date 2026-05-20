import { TableNames } from "../constant";
import { db } from "../db";
import { storage } from "../storage";
import { sql } from "drizzle-orm";

// 🛠️ Generic function jo direct table string se record nikalega
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

export const withAudit = (
    tableName: TableNames, // Sirf ek baar table ka naam aayega
    action: "ADD" | "EDIT" | "DELETE" | "ADD/EDIT",
    storageOperation: (req: any) => Promise<any>,
    statusCode = 200
) => {
    return async (req: any, res: any) => {
        try {
            // 1. Session user authentication details
            const userId = req.session?.userId || "system";
            const userName = req.session?.userId ? `User ID: ${req.session.userId}` : "System";

            const rawId = req.params.id;
            let oldData: any = null;

            // 2. EDIT / DELETE ke liye automatic internal GET call
            if ((action === "EDIT" || action === "DELETE") && rawId) {
                const queryParam = isNaN(Number(rawId)) ? rawId : parseInt(rawId);

                // user_profiles me string ID aane par user_id check karega, baki sab me standard id
                const filterColumn = (tableName === "user_profiles" && isNaN(Number(rawId))) ? "user_id" : "id";

                oldData = await getRecordByField(tableName, filterColumn, queryParam);
            }

            // 3. Actual Storage Query/Operation Run Karo
            const result = await storageOperation(req);
            const recordId = result?.id || result?.userId || rawId || "N/A";

            // 4. Background Audit Log Fire
            storage.logAudit(db, {
                userId: String(userId),
                tableName, // 👈 Database wala asli naam hi direct audit table me store ho gaya!
                recordId: String(recordId),
                action,
                oldData,
                newData: action === "DELETE" ? null : result,
            });

            // 5. Response handling
            if (statusCode === 204) {
                return res.sendStatus(204);
            } else {
                return res.status(statusCode).json(result);
            }
        } catch (e: any) {
            console.error(`Audit API Error [${action} on ${tableName}]:`, e);
            return res.status(500).json({ message: e.message || "Failed to process request" });
        }
    };
};