// export const getPaginationProps = (apiResponse: any, setCurrentPage: (p: number) => void) => {
//     if (!apiResponse) return null;
//     const { currentPage, totalPages, totalCount } = apiResponse;
//     return {
//         totalCount,
//         currentPage,
//         totalPages,
//         hasNext: currentPage < totalPages,
//         hasPrev: currentPage > 1,
//         onNext: () => setCurrentPage(currentPage + 1),
//         onPrev: () => setCurrentPage(currentPage - 1),
//     };
// };
export const getPaginationProps = (
    apiResponse: any,
    setCurrentPage: (p: number) => void,
    setPageSize?: (size: number) => void
) => {
    if (!apiResponse) return null;

    if (Array.isArray(apiResponse)) {
        return {
            totalCount: apiResponse.length,
            currentPage: 1,
            totalPages: 1,
            pageSize: apiResponse.length,
            hasNext: false,
            hasPrev: false,
            onNext: () => { },
            onPrev: () => { },
            onPageSizeChange: () => { },
        };
    }

    const { currentPage, totalPages, totalCount, pageSize } = apiResponse;

    return {
        totalCount: totalCount ?? 0,
        currentPage: currentPage ?? 1,
        totalPages: totalPages ?? 1,
        pageSize: pageSize ?? totalCount ?? 0,
        hasNext: (currentPage ?? 1) < (totalPages ?? 1),
        hasPrev: (currentPage ?? 1) > 1,
        onNext: () => setCurrentPage((currentPage ?? 1) + 1),
        onPrev: () => setCurrentPage((currentPage ?? 1) - 1),
        onPageSizeChange: (size: number) => {
            if (setPageSize) {
                setPageSize(size);
                setCurrentPage(1);
            }
        }
    };
};