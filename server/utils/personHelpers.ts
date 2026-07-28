// personHelpers.ts
// import { VISITOR_PREFIX } from "./constants";

import { VISITOR_PREFIX } from "../constant";

/**
 * 1. Visitor Code Checker
 * Check करता है कि employeeCode 'zimvis' से शुरू होता है या नहीं
 */
export function isVisitorCode(code: string | null | undefined): boolean {
    if (!code) return false;
    return code.toLowerCase().trim().startsWith(VISITOR_PREFIX.toLowerCase());
}

/**
 * 2. Regular Employee Code Checker
 * Check करता है कि code visitor का नहीं है (यानी zimvis वाला Skip करना है)
 */
export function isRegularEmployeeCode(code: string | null | undefined): boolean {
    return !isVisitorCode(code);
}