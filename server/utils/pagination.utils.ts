import { sql } from "drizzle-orm";
export const withPagination = async (
    db: any,
    table: any,
    query: any,
    page?: number | string,
    pageSize?: number | string,
    whereClause?: any 
) => {
    if (!pageSize) {
        return typeof query.execute === "function" || typeof query.then === "function"
            ? await query
            : query;
    }
    const isArrayData = Array.isArray(query);
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
    const limit = size;
    const offset = (p - 1) * size;
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(table);
    if (whereClause) {
        countQuery = countQuery.where(whereClause);
    }
    const [data, [totalResult]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    return {
        data,
        totalCount: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / size),
        currentPage: p,
        pageSize: size
    };
};