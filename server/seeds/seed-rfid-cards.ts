import { db } from "../db"; 
import { mssqlPool } from "../db"; 
import { RFID_CARDS } from "../constant";
import { visitorCards } from "../../shared/schema";
import mssql from "mssql";
export async function seedRfidCards() {
    console.log("🚀 Seeding RFID Cards into MS SQL and PostgreSQL...");
    try {
        const mssqlClient = await mssqlPool.connect();
        await mssqlClient.query("DELETE FROM VisitorCards");
        console.log("🧹 Cleaned MS SQL VisitorCards table.");
        for (const card of RFID_CARDS) {
            await mssqlClient.request()
                .input('Name', mssql.NVarChar, card.name)
                .input('CardNumber', mssql.NVarChar, card.cardNumber)
                .input('ExpiryFrom', mssql.DateTime, new Date(card.expiryFrom))
                .input('ExpiryTo', mssql.DateTime, new Date(card.expiryTo))
                .input('LocationId', mssql.Int, card.locationId)
                .input('Location', mssql.NVarChar, card.location.toString())
                .query(`
                    INSERT INTO VisitorCards (Name, CardNumber, ExpiryFrom, ExpiryTo, LocationId, Location) 
                    VALUES (@Name, @CardNumber, @ExpiryFrom, @ExpiryTo, @LocationId, @Location)
                `);
        }
        await mssqlClient.close();
        console.log("✅ MS SQL Seeding Complete.");
        await db.delete(visitorCards); 
        console.log("🧹 Cleaned PostgreSQL visitorCards table.");
        await db.insert(visitorCards).values(
            RFID_CARDS.map(card => ({
                ...card,
                expiryFrom: new Date(card.expiryFrom),
                expiryTo: new Date(card.expiryTo),
            }))
        );
        console.log("✅ PostgreSQL Seeding Complete.");
        console.log("🎉 All RFID cards synchronized successfully!");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        throw err;
    }
}