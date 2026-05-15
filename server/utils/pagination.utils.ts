import { sql } from "drizzle-orm";
export const withPagination = async (
    db: any,
    table: any,
    query: any,
    page?: number | string,
    pageSize?: number | string
) => {
    // Agar pageSize -1 hai, toh pagination bypass kar do
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
    const size = pageSize && Number(pageSize) > 0 ? Number(pageSize) : 5;

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