import { VisitorCardAdapter } from "@shared/mssql_schema";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { db, mssqlPool } from "../db";
import { visitorCards } from "@shared/schema";

/**
 * MS SQL database se VisitorCards ko PostgreSQL me sync karta hai
 */
import { notInArray } from "drizzle-orm";

export async function syncVisitorCardsFromMsSql() {
    try {
        if (!mssqlPool.connected) {
            await mssqlPool.connect();
        }

        const request = mssqlPool.request();
        const result = await request.query("SELECT * FROM VisitorCards");
        const msCards = result.recordset || [];

        if (msCards.length === 0) {
            return;
        }

        const parseSafeDate = (dateVal: any) => {
            if (!dateVal) return null;
            const parsed = new Date(dateVal);
            if (isNaN(parsed.getTime())) return null;
            return parsed;
        };

        // Active MS SQL IDs track karne ke liye array
        const activeMsIds: number[] = [];

        for (const msRow of msCards) {
            const msId = msRow.Id || msRow.VisitorCardId || null;
            const cardNumber = msRow.CardNumber || null;
            const name = msRow.CardName || msRow.Name || "Unnamed Card";
            const locationId = msRow.LocationId || null;
            const location = msRow.Location || null;

            const expiryFrom = parseSafeDate(msRow.ExpiryFrom);
            const expiryTo = parseSafeDate(msRow.ExpiryTo);

            if (!msId || !cardNumber) {
                continue;
            }

            // Current ID ko list mein push karein
            activeMsIds.push(Number(msId));

            const [visitorMapping] = await db
                .select()
                .from(schema.visitors)
                .where(eq(schema.visitors.visitorCardId, Number(msId)))
                .limit(1);

            const assignedStatus = !!visitorMapping;

            const [existingCard] = await db
                .select()
                .from(visitorCards)
                .where(eq(visitorCards.msId, Number(msId)))
                .limit(1);

            if (existingCard) {
                await db
                    .update(visitorCards)
                    .set({
                        name: name,
                        cardNumber: cardNumber,
                        locationId: locationId ? Number(locationId) : null,
                        location: location ? Number(location) : null,
                        expiryFrom: expiryFrom,
                        expiryTo: expiryTo,
                        isAssigned: assignedStatus,
                        updatedAt: new Date()
                    })
                    .where(eq(visitorCards.msId, Number(msId)));
            } else {
                await db
                    .insert(visitorCards)
                    .values({
                        msId: Number(msId),
                        name: name,
                        cardNumber: cardNumber,
                        locationId: locationId ? Number(locationId) : null,
                        location: location ? Number(location) : null,
                        expiryFrom: expiryFrom,
                        expiryTo: expiryTo,
                        isAssigned: assignedStatus,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
            }
        }

        // Jo IDs incoming array mein nahi hain, unhe Postgres se wipe-out karein
        if (activeMsIds.length > 0) {
            await db
                .delete(visitorCards)
                .where(notInArray(visitorCards.msId, activeMsIds));
        }
    } catch (error) {
        throw error;
    }
}