
import { VISITOR_PREFIX } from "../constant";


export function isVisitorCode(code: string | null | undefined): boolean {
    if (!code) return false;
    return code.toLowerCase().trim().startsWith(VISITOR_PREFIX.toLowerCase());
}


export function isRegularEmployeeCode(code: string | null | undefined): boolean {
    return !isVisitorCode(code);
}