 // Aapke DB connection files ka path
import { VisitorCardAdapter } from "@shared/mssql_schema";
import { visitorCards } from "@shared/schema"; // Aapka schema definition
import * as schema from "@shared/schema";
 // Aapka adapter path
import { eq } from "drizzle-orm";
import mssql from "mssql";
import { db, mssqlPool } from "../db";

/**
 * MS SQL Database se saare cards ka data fetch karke Postgres me sync (Upsert) karta hai
 */
export async function syncVisitorCardsFromMsSql() {
    console.log("🔄 Starting Bulk Visitor Cards Sync from MS SQL...");

    try {
        // 1. Ensure MS SQL Connection is Active
        if (!mssqlPool.connected) {
            await mssqlPool.connect();
        }

        // 2. MS SQL se saare cards ka data uthao
        const request = mssqlPool.request();
        const result = await request.query("SELECT * FROM VisitorCards");
        const msCards = result.recordset || [];

        if (msCards.length === 0) {
            console.log("ℹ️ MS SQL me koi visitor cards nahi mile.");
            return;
        }

        console.log(`📥 MS SQL se ${msCards.length} cards mile. Local Postgres me sync shuru ho raha hai...`);

        // 3. Loop through each card and Upsert into Postgres
        for (const msRow of msCards) {
            // Adapter se data ko Postgres format me map karo
            const pgData = VisitorCardAdapter.toPostgres(msRow);

            if (!pgData.msId || !pgData.cardNumber) {
                console.warn(`⚠️ Card ka msId ya CardNumber missing hai (MS ID: ${pgData.msId}). Skipping...`);
                continue;
            }

            // 4. REAL-TIME ASSIGNMENT CHECK: 
            // Check karein ki kya ye card hamare visitors table me kisi ko assigned hai?
            // (Yahan aapki 'visitors' table aur column ka naam 'visitorCardId' ke mutabik check ho raha hai)
            const [visitorMapping] = await db
                .select()
                .from(schema.visitors)
                .where(eq(schema.visitors.visitorCardId, Number(pgData.msId)))
                .limit(1);

            const assignedStatus = !!visitorMapping; // Agar record mila to true, nahi to false

            // 5. Local Postgres me check karo ki ye card pehle se exist karta hai ya nahi
            const [existingCard] = await db
                .select()
                .from(visitorCards)
                .where(eq(visitorCards.msId, pgData.msId))
                .limit(1);

            if (existingCard) {
                // A. Agar card pehle se hai -> UPDATE karein (including isAssigned field)
                await db
                    .update(visitorCards)
                    .set({
                        name: pgData.name,
                        cardNumber: pgData.cardNumber,
                        locationId: pgData.locationId,
                        location: pgData.location || null,
                        expiryFrom: pgData.expiryFrom,
                        expiryTo: pgData.expiryTo,
                        isAssigned: assignedStatus, // 🔥 Dynamic sync update
                        updatedAt: new Date()
                    })
                    .where(eq(visitorCards.msId, pgData.msId));
            } else {
                // B. Agar card naya hai -> INSERT karein
                await db
                    .insert(visitorCards)
                    .values({
                        msId: pgData.msId,
                        name: pgData.name,
                        cardNumber: pgData.cardNumber,
                        locationId: pgData.locationId,
                        location: pgData.location || null,
                        expiryFrom: pgData.expiryFrom,
                        expiryTo: pgData.expiryTo,
                        isAssigned: assignedStatus, // 🔥 Naye card ka status set karein
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
            }
        }

        console.log("✅ Visitor Cards Sync completed successfully!");
    } catch (error) {
        console.error("❌ Visitor Cards Sync failed with error:", error);
        throw error;
    }
}