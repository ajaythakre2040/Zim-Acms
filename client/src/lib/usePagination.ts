export const getPaginationProps = (apiResponse: any, setCurrentPage: (p: number) => void) => {
    if (!apiResponse) return null;
    const { currentPage, totalPages, totalCount } = apiResponse;
    return {
        totalCount,
        currentPage,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
        onNext: () => setCurrentPage(currentPage + 1),
        onPrev: () => setCurrentPage(currentPage - 1),
    };
};