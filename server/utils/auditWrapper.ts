import { db } from "../db";
import { storage } from "../storage";

export const withAudit = (
    tableName: string,
    action: "ADD" | "EDIT" | "DELETE" | "ADD/EDIT",
    storageOperation: (req: any) => Promise<any>,
    statusCode = 200
) => {
    return async (req: any, res: any) => {
        try {
            // 1. Session se user ID nikal lo
            const userId = req.session?.userId || "system";
            const userName = req.session?.userId ? `User ID: ${req.session.userId}` : "System";

            // URL se record ki id nikalna (EDIT aur DELETE ke cases ke liye)
            const paramId = req.params.id ? parseInt(req.params.id) : null;
            let oldData: any = null;

            // 2. Agar EDIT ya DELETE ho raha hai, toh operation se PEHLE old data fetch karo
            if ((action === "EDIT" || action === "DELETE") && paramId) {
                try {
                    // YAHAN DHYAN DEIN: Aapke storage me jo bhi generic single record fetch karne ka function ho
                    // Jaise getUser(id) ya getRecord(id), use yahan call karna hoga table ke hisab se.
                    // Ek safe approach ke liye hum dynamic method check kar rahe hain:
                    if (tableName === "user_profiles" && typeof (storage as any).getUser === "function") {
                        oldData = await (storage as any).getUser(paramId);
                    } else if (tableName === "people" && typeof (storage as any).getEmployee === "function") {
                        oldData = await (storage as any).getEmployee(paramId);
                    }
                    // Agar aapke paas koi dusri table hai, toh yahan ek aur else if jod sakte ho
                } catch (fetchErr) {
                    console.error("Old data fetch karne me dikkat aayi:", fetchErr);
                }
            }

            // 3. Actual database/storage operation run karo (Insert/Update/Delete execute hoga)
            const result = await storageOperation(req);

            // 4. Record ID auto-detect karo
            const recordId = result?.id || paramId || "N/A";

            // 5. Background Audit Log Fire karo
            storage.logAudit(db, {
                userId: String(userId),
                userName: userName,
                tableName,
                recordId: String(recordId),
                action,
                oldData: oldData ? oldData : null, // Ab yahan asli purana data jayega
                newData: action === "DELETE" ? null : result, // Naya data jo save hua
            });

            // 6. Response handle karo
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