import { db, dbMsSql } from "../db";
import {
    people,
    departments,
    designations,
    doors,
    peopleAdditionalDetails,
    visitorMaster,
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { PersonAdapter, VisitorMasterAdapter } from "@shared/mssql_schema";
import { ACCESS_RULES } from "../constant";
import { isRegularEmployeeCode, isVisitorCode } from "../utils/personHelpers";

export class SyncService {
    /**
     * MS SQL to Postgres Sync Logic (Only Regular Employees, NO Visitors)
     */
    static async processPeopleSync(
        onNewEmployeeInserted?: (employeeCode: string) => void
    ): Promise<any[]> {
        // 1. Fetch Postgres and MS SQL Data in parallel
        const [pgDataRaw, msDataRaw] = await Promise.all([
            db
                .select({
                    person: {
                        ...people,
                        lastSeenTime: sql<string>`
            TO_CHAR(${people.lastSeenTime}, 'YYYY-MM-DD"T"HH24:MI:SS')
          `,
                    },
                    departmentName: departments.name,
                    designationName: designations.name,
                    lastPunchDoorName: doors.name,
                    additionalDetails: peopleAdditionalDetails,
                })
                .from(people)
                .leftJoin(departments, eq(people.departmentId, departments.id))
                .leftJoin(designations, eq(people.designationId, designations.id))
                .leftJoin(doors, eq(people.lastPunchDoorId, doors.id))
                .leftJoin(
                    peopleAdditionalDetails,
                    eq(people.employeeCode, peopleAdditionalDetails.employeeCode),
                ),
            dbMsSql.select().from({ dbName: "Employees" }).execute(),
        ]);

        const msIds = new Set();
        const ruleIdToName = Object.fromEntries(
            Object.entries(ACCESS_RULES).map(([key, value]) => [value, key]),
        );

        // 2. Format current Postgres data (Filter out Visitors)
        const currentPgData = pgDataRaw
            // 🚫 Postgres list se Visitors ko hatayein
            .filter((row) => isRegularEmployeeCode(row.person.employeeCode))
            .map((row) => {
                const {
                    id: _detailId,
                    employeeCode: _detailCode,
                    createdAt: _detailCreated,
                    updatedAt: _detailUpdated,
                    ...restOfAdditionalDetails
                } = row.additionalDetails || {};

                return {
                    ...row.person,
                    ...restOfAdditionalDetails,
                    departmentName: row.departmentName || "N/A",
                    designationName: row.designationName || "N/A",
                    lastPunchDoorName: row.lastPunchDoorName || "No Door",
                    ruleName:
                        row.person.ruleid !== null
                            ? ruleIdToName[row.person.ruleid] || "UNKNOWN_RULE"
                            : "NO_RULE",
                };
            });

        // 3. Process MS SQL Records (Insert / Update) - ONLY REGULAR EMPLOYEES
        for (const msRow of msDataRaw || []) {
            const mapped = PersonAdapter.toPostgres(msRow);
            if (!mapped.msId) continue;

            // 🚫 अगर MS SQL record का Code Visitor Code है तो उसे skip करें
            if (isVisitorCode(mapped.employeeCode)) {
                continue;
            }

            msIds.add(mapped.msId);
            const existingIndex = currentPgData.findIndex(
                (p) => p.msId === mapped.msId,
            );

            if (existingIndex === -1) {
                // Insert new employee
                try {
                    const [newRec] = await db
                        .insert(people)
                        .values({
                            msId: mapped.msId,
                            employeeCode: mapped.employeeCode,
                            employeeName: mapped.employeeName ?? "Unknown",
                            ruleid: mapped.ruleid ?? null,
                            locationId: mapped.locationId ?? null,
                            externalId: mapped.externalId ?? null,
                            personType: "employee",
                            status: "active",
                            sourceSystem: "mssql_bio",
                            updatedAt: new Date(),
                            createdAt: new Date(),
                        })
                        .returning();

                    if (newRec?.employeeCode && onNewEmployeeInserted) {
                        onNewEmployeeInserted(newRec.employeeCode);
                    }

                    currentPgData.push({
                        ...newRec,
                        departmentName: "N/A",
                        designationName: "N/A",
                        lastPunchDoorName: "No Door",
                        ruleName:
                            newRec.ruleid !== null
                                ? ruleIdToName[newRec.ruleid] || "UNKNOWN_RULE"
                                : "NO_ROLE",
                    });
                } catch (e) {
                    // Silent catch
                }
            } else {
                // Update existing employee
                const existing = currentPgData[existingIndex];
                const hasChanged =
                    existing.employeeName !== mapped.employeeName ||
                    existing.employeeCode !== mapped.employeeCode 
                    // existing.ruleid !== mapped.ruleid;

                if (hasChanged) {
                    try {
                        const [updatedRec] = await db
                            .update(people)
                            .set({
                                employeeName: mapped.employeeName ?? "Unknown",
                                employeeCode: mapped.employeeCode,
                                // ruleid: mapped.ruleid ?? null,
                                updatedAt: new Date(),
                            })
                            .where(eq(people.msId, mapped.msId))
                            .returning();

                        currentPgData[existingIndex] = {
                            ...existing,
                            ...updatedRec,
                            ruleName:
                                updatedRec.ruleid !== null
                                    ? ruleIdToName[updatedRec.ruleid] || "UNKNOWN_RULE"
                                    : "NO_ROLE",
                        };
                    } catch (e) {
                        console.error("Employee update sync error:", e);
                    }
                }
            }
        }

        // 4. Delete Sync (Remove employees deleted from MS SQL)
        for (const pgRow of currentPgData) {
            if (pgRow.msId && !msIds.has(pgRow.msId)) {
                try {
                    await db.delete(people).where(eq(people.msId, pgRow.msId));
                } catch (e) {
                    console.error("Delete sync error:", e);
                }
            }
        }

        // 5. Sort & Deduplicate Result
        currentPgData.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

        const uniquePeople = Array.from(
            new Map(
                currentPgData.map((p) => [`${p.msId || p.employeeCode || p.id}`, p]),
            ).values(),
        );

        return uniquePeople;
    }


}
export class VisitorSyncService {
    /**
     * MS SQL to Postgres Sync Logic (ONLY Visitors into `visitor_master`)
     */
    static async processVisitorsSync(
        onNewVisitorInserted?: (employeeCode: string) => void
    ): Promise<any[]> {
        // 1. Fetch Postgres (visitorMaster) & MS SQL Data in parallel
        const [pgDataRaw, msDataRaw] = await Promise.all([
            db
                .select({
                    visitor: {
                        ...visitorMaster,
                        lastSeenTime: sql<string>`
            TO_CHAR(${visitorMaster.lastSeenTime}, 'YYYY-MM-DD"T"HH24:MI:SS')
          `,
                    },
                    lastPunchDoorName: doors.name,
                    additionalDetails: peopleAdditionalDetails,
                })
                .from(visitorMaster)
                .leftJoin(doors, eq(visitorMaster.lastPunchDoorId, doors.id))
                .leftJoin(
                    peopleAdditionalDetails,
                    eq(visitorMaster.employeeCode, peopleAdditionalDetails.employeeCode),
                ),
            dbMsSql.select().from({ dbName: "Employees" }).execute(),
        ]);

        const msIds = new Set();
        const ruleIdToName = Object.fromEntries(
            Object.entries(ACCESS_RULES).map(([key, value]) => [value, key]),
        );

        // 2. Format current Postgres visitorMaster data
        const currentPgData = pgDataRaw
            .filter((row) => isVisitorCode(row.visitor.employeeCode))
            .map((row) => {
                const {
                    id: _detailId,
                    employeeCode: _detailCode,
                    createdAt: _detailCreated,
                    updatedAt: _detailUpdated,
                    ...restOfAdditionalDetails
                } = row.additionalDetails || {};

                return {
                    ...row.visitor,
                    ...restOfAdditionalDetails,
                    lastPunchDoorName: row.lastPunchDoorName || "No Door",
                    ruleName:
                        row.visitor.ruleid !== null
                            ? ruleIdToName[row.visitor.ruleid] || "UNKNOWN_RULE"
                            : "NO_RULE",
                };
            });

        // 3. Process MS SQL Records (Insert / Update) -> visitorMaster
        for (const msRow of msDataRaw || []) {
            // 👈 FIX: PersonAdapter ki jagah VisitorMasterAdapter use karein
            const mapped = VisitorMasterAdapter.toPostgres(msRow);
            if (!mapped.msId) continue;

            // 🛑 Check if code is a Visitor Code
            if (!isVisitorCode(mapped.employeeCode)) {
                continue;
            }

            msIds.add(mapped.msId);
            const existingIndex = currentPgData.findIndex(
                (p) => p.msId === mapped.msId,
            );

            if (existingIndex === -1) {
                // Insert new visitor into `visitorMaster`
                try {
                    const [newRec] = await db
                        .insert(visitorMaster)
                        .values({
                            msId: mapped.msId,
                            employeeCode: mapped.employeeCode,
                            employeeName: mapped.employeeName ?? "Unknown Visitor",
                            rfidCardNo: mapped.rfidCardNo ?? null, // 👈 Now typed properly!
                            ruleid: mapped.ruleid ?? null,
                            locationId: mapped.locationId ?? null,
                            externalId: mapped.externalId ?? null,
                            personType: "visitor",
                            status: mapped.status ?? "active",
                            updatedAt: new Date(),
                            createdAt: new Date(),
                        })
                        .returning();

                    if (newRec?.employeeCode && onNewVisitorInserted) {
                        onNewVisitorInserted(newRec.employeeCode);
                    }

                    currentPgData.push({
                        ...newRec,
                        lastPunchDoorName: "No Door",
                        ruleName:
                            newRec.ruleid !== null
                                ? ruleIdToName[newRec.ruleid] || "UNKNOWN_RULE"
                                : "NO_RULE",
                    });
                } catch (e) {
                    console.error("Error inserting visitor into visitorMaster:", e);
                }
            } else {
                // Update existing visitor in `visitorMaster`
                const existing = currentPgData[existingIndex];

                // 👈 FIX: rfidCardNo change detect karein
                const hasChanged =
                    existing.employeeName !== mapped.employeeName ||
                    existing.employeeCode !== mapped.employeeCode ||
                    existing.rfidCardNo !== mapped.rfidCardNo ||
                    existing.ruleid !== mapped.ruleid;

                if (hasChanged) {
                    try {
                        const [updatedRec] = await db
                            .update(visitorMaster)
                            .set({
                                employeeName: mapped.employeeName ?? "Unknown Visitor",
                                employeeCode: mapped.employeeCode,
                                rfidCardNo: mapped.rfidCardNo ?? null, // 👈 RFID update handling
                                ruleid: mapped.ruleid ?? null,
                                updatedAt: new Date(),
                            })
                            .where(eq(visitorMaster.msId, mapped.msId))
                            .returning();

                        currentPgData[existingIndex] = {
                            ...existing,
                            ...updatedRec,
                            ruleName:
                                updatedRec.ruleid !== null
                                    ? ruleIdToName[updatedRec.ruleid] || "UNKNOWN_RULE"
                                    : "NO_RULE",
                        };
                    } catch (e) {
                        console.error("Error updating visitor in visitorMaster:", e);
                    }
                }
            }
        }

        // 4. Delete Sync (Remove visitors deleted from MS SQL)
        for (const pgRow of currentPgData) {
            if (pgRow.msId && !msIds.has(pgRow.msId)) {
                try {
                    await db.delete(visitorMaster).where(eq(visitorMaster.msId, pgRow.msId));
                } catch (e) {
                    console.error("Error deleting visitor from visitorMaster:", e);
                }
            }
        }

        // 5. Sort & Deduplicate Result
        currentPgData.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

        const uniqueVisitors = Array.from(
            new Map(
                currentPgData.map((p) => [`${p.msId || p.employeeCode || p.id}`, p]),
            ).values(),
        );

        return uniqueVisitors;
    }
}