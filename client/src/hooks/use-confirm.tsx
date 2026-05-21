import React, { createContext, useContext, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
};

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);

    const confirm = (opts: ConfirmOptions) => {
        setOptions(opts);
        return new Promise<boolean>((resolve) => {
            setPromise({ resolve });
        });
    };

    const handleClose = () => {
        setPromise(null);
        setOptions(null);
    };

    const handleCancel = () => {
        if (promise) promise.resolve(false);
        handleClose();
    };

    const handleConfirm = () => {
        if (promise) promise.resolve(true);
        handleClose();
    };

    return (
        <>
            <ConfirmContext.Provider value={confirm}>
                {children}
            </ConfirmContext.Provider>

            <AlertDialog open={promise !== null} onOpenChange={(open) => { if (!open) handleCancel(); }}>
                <AlertDialogContent className="sm:max-w-[420px]">
                    <AlertDialogHeader className="flex flex-col items-center text-center sm:text-left sm:items-start gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto sm:mx-0 ${options?.variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                            }`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 w-full">
                            <AlertDialogTitle className="text-lg">
                                {options?.title || "Are you sure?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-muted-foreground">
                                {options?.description}
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel onClick={handleCancel}>
                            {options?.cancelText || "Cancel"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className={options?.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                            onClick={handleConfirm}
                        >
                            {options?.confirmText || "Continue"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
}