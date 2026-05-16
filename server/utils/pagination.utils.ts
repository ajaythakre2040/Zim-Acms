import { sql } from "drizzle-orm";

export const withPagination = async (
    db: any,
    table: any,
    query: any,
    page?: number | string,
    pageSize?: number | string
) => {
    // Rule: Agar pageSize nahi aaya, toh seedha pure data ka SIMPLE ARRAY return karo
    if (!pageSize) {
        return await query;
    }

    // Rule: Agar pageSize -1 hai, toh OBJECT format mein all data do
    if (pageSize === -1 || pageSize === "-1") {
        const data = await query;
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

    const limit = size;
    const offset = (p - 1) * size;

    const [data, [totalResult]] = await Promise.all([
        query.limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(table)
    ]);

    return {
        data,
        totalCount: Number(totalResult.count),
        totalPages: Math.ceil(Number(totalResult.count) / size),
        currentPage: p,
        pageSize: size
    };
};