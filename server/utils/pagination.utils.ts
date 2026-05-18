import { sql } from "drizzle-orm";

export const withPagination = async (
    db: any,
    table: any,
    query: any,
    page?: number | string,
    pageSize?: number | string
) => {
    // Rule 1: Agar pageSize nahi aaya, toh seedha pure data ka SIMPLE ARRAY return karo
    if (!pageSize) {
        return typeof query.execute === "function" || typeof query.then === "function"
            ? await query
            : query; // Agar pehle se array hai toh direct return
    }

    // Pehle check kar lete hain ki data pehle se Array ban chuka hai ya Drizzle Query hai
    const isArrayData = Array.isArray(query);

    // Rule 2: Agar pageSize -1 hai, toh OBJECT format mein all data do
    if (pageSize === -1 || pageSize === "-1") {
        const data = isArrayData ? query : await query;
        const totalCount = data.length;
        return {
            data,
            totalCount,
            totalPages: 1,
            currentPage: 1,
            pageSize: totalCount
        };
    }

    const p = page && Number(page) > 0 ? Number(page) : 1;
    const size = Number(pageSize) > 0 ? Number(pageSize) : 1;

    // --- CASE A: Agar data JavaScript Array hai (Jaise Reports ka data) ---
    if (isArrayData) {
        const start = (p - 1) * size;
        const end = start + size;
        const paginatedData = query.slice(start, end);

        return {
            data: paginatedData,
            totalCount: query.length,
            totalPages: Math.ceil(query.length / size),
            currentPage: p,
            pageSize: size
        };
    }

    // --- CASE B: Agar data Drizzle DB Query object hai (Normal Tables) ---
    const limit = size;
    const offset = (p - 1) * size;

    const [data, [totalResult]] = await Promise.all([
        query.limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(table)
    ]);

    return {
        data,
        totalCount: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / size),
        currentPage: p,
        pageSize: size
    };
};