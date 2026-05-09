import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";

// 1. Interface for Type Safety
interface MenuPermission {
    code: string;
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
    print: boolean;
}

export function usePermission(menuCode: string) {
    const { user } = useAuth();

    // useMemo use kar rahe hain taaki calculation baar-baar na ho
    return useMemo(() => {
        // Default: Agar user nahi hai toh sab false
        const defaultPermissions = {
            canView: false,
            canAdd: false,
            canEdit: false,
            canDelete: false,
            canExport: false,
            canPrint: false,
            isLoading: !user, // Loading state check karne ke liye
        };

        if (!user || !(user as any).menuPermissions) {
            return defaultPermissions;
        }

        // 2. Aapke JSON array mein se specific code dhoondna
        const permissions = (user as any).menuPermissions.find(
            (p: any) => p.code === menuCode
        );

        // 3. Return formatted permissions
        return {
            canView: permissions?.view ?? false,
            canAdd: permissions?.add ?? false,
            canEdit: permissions?.edit ?? false,
            canDelete: permissions?.delete ?? false,
            canExport: permissions?.export ?? false,
            canPrint: permissions?.print ?? false,
            isLoading: false,
        };
    }, [user, menuCode]);
}