import { db } from "../db"; 
import { mssqlPool } from "../db"; 
import { RFID_CARDS } from "../constant";
import { visitorCards } from "../../shared/schema";
import mssql from "mssql";

export async function seedRfidCards() {
    try {
        const mssqlClient = await mssqlPool.connect();
        await mssqlClient.query("DELETE FROM VisitorCards");
        
        await db.delete(visitorCards); 

        // Ek-ek karke loop chalayenge taaki MS SQL ki ID mil sake aur PG me sync ho sake
        for (const card of RFID_CARDS) {
            
            // ==========================================
            // STEP 1: PEHLE MS SQL ME INSERT KAREIN
            // ==========================================
            const msSqlResult = await mssqlClient.request()
                .input('Name', mssql.NVarChar, card.name)
                .input('CardNumber', mssql.NVarChar, card.cardNumber)
                .input('ExpiryFrom', mssql.DateTime, new Date(card.expiryFrom))
                .input('ExpiryTo', mssql.DateTime, new Date(card.expiryTo))
                .input('LocationId', mssql.Int, card.locationId)
                .input('Location', mssql.NVarChar, card.location?.toString() || "")
                .query(`
                    INSERT INTO VisitorCards (Name, CardNumber, ExpiryFrom, ExpiryTo, LocationId, Location) 
                    VALUES (@Name, @CardNumber, @ExpiryFrom, @ExpiryTo, @LocationId, @Location);
                    SELECT SCOPE_IDENTITY() AS id;
                `);

            let insertedMsSqlId: number | null = null;
            if (msSqlResult.recordset && msSqlResult.recordset.length > 0) {
                insertedMsSqlId = msSqlResult.recordset[0].id;
            }

            if (!insertedMsSqlId) {
                throw new Error(`Failed to retrieve MS SQL ID for card: ${card.cardNumber}`);
            }

            // ==========================================
            // STEP 2: AB POSTGRES ME MS_ID KE SATH INSERT KAREIN
            // ==========================================
            await db.insert(visitorCards).values({
                name: card.name,
                cardNumber: card.cardNumber,
                locationId: card.locationId,
                location: card.location || null,
                expiryFrom: new Date(card.expiryFrom),
                expiryTo: new Date(card.expiryTo),
                msId: insertedMsSqlId, // 🌟 MS SQL ki primary key id yahan save ho rhi h
            });
        }

        await mssqlClient.close();
    } catch (err) {
        throw err;
    }
}