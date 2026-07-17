import fs from 'fs';
import path from 'path';
import { decryptSerialNumber } from '../utils/cryptoUtils';
import { db } from '../db'; 
import { unauthorizedDeviceLogs } from '../../shared/schema';

export class DeviceSecurityService {
    private static cachedSerials: Set<string> | null = null;
    private static cacheTimestamp: number = 0;
    private static readonly CACHE_TTL_MS = 60000; // 1 minute Cache Time-To-Live

    /**
     * Resolves the target JSON path safely on local and virtual environments.
     */
    private static getSecureSerialsPath(): string {
        // Option 1: Hardcoded developer absolute path
        const absolutePath = "F:\\python\\seft project\\Zim - Acms\\server\\Config\\secure_serials.json";
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }

        // Option 2: Dynamic runtime fallback path (useful for deployment or folder changes)
        return path.join(process.cwd(), "server", "Config", "secure_serials.json");
    }

    /**
     * Retrieves, decrypts, and normalizes authorized serial numbers from configuration.
     * Utilizes an in-memory TTL cache to optimize file system read operations.
     */
    public static async getAuthorizedSerials(): Promise<Set<string>> {
        const now = Date.now();

        // Check if valid cache exists to prevent continuous disk read cycles
        if (this.cachedSerials && (now - this.cacheTimestamp < this.CACHE_TTL_MS)) {
            return this.cachedSerials;
        }

        // Resolve absolute or dynamic path
        const filePath = this.getSecureSerialsPath();

        // 1. Agar secure_serials.json file hi gayab hai
        if (!fs.existsSync(filePath)) {
            const errorMsg = `Critical secure serials file missing at target location: ${filePath}`;
            console.error(`❌ [SECURITY LAYER ERROR] ${errorMsg}`);

            await this.logSystemError("FILE_MISSING", errorMsg);
            throw new Error("Device Verification Failed: Authorization policy file is missing.");
        }

        try {
            const rawJson = fs.readFileSync(filePath, "utf-8");
            const encryptedSerials: string[] = JSON.parse(rawJson);

            const decryptedList = new Set<string>();

            for (const cipherText of encryptedSerials) {
                // Formatting check
                if (!cipherText || !cipherText.includes(':')) {
                    await this.logSystemError("INVALID_FORMAT", `Skipping malformed entry: ${cipherText}`);
                    continue;
                }

                const decrypted = decryptSerialNumber(cipherText).trim().toLowerCase();
                if (decrypted) {
                    decryptedList.add(decrypted);
                } else {
                    // Agar decryption empty string return kare (Galat secret key ya corrupt data)
                    await this.logSystemError("DECRYPTION_FAILED", `Failed to decrypt text: ${cipherText}`);
                }
            }

            // 2. Agar ek bhi serial decrypt nahi ho paya
            if (decryptedList.size === 0) {
                const errorMsg = "Decryption integrity check failed. Zero authorized devices loaded.";
                console.error(`❌ [SECURITY LAYER ERROR] ${errorMsg}`);

                await this.logSystemError("EMPTY_AUTHORIZED_LIST", errorMsg);
                throw new Error("Device Verification Failed: Unable to decrypt target serial numbers.");
            }

            // Update local memory cache state
            this.cachedSerials = decryptedList;
            this.cacheTimestamp = now;

            console.log(`[SECURITY SERVICE] Authorized serials updated successfully. Total count: ${decryptedList.size}`);
            return decryptedList;

        } catch (error: unknown) {
            const err = error as Error;
            console.error(`[SECURITY SERVICE FATAL] Loader failure: ${err.message}`);

            await this.logSystemError("FATAL_LOAD_ERROR", err.message);
            throw err;
        }
    }

    /**
     * Helper method to log critical config/decryption errors directly inside Postgres DB
     */
    private static async logSystemError(errorType: string, message: string) {
        try {
            await db.insert(unauthorizedDeviceLogs).values({
                deviceId: 0,
                deviceName: "SYSTEM_SECURITY_SERVICE",
                serialNumber: errorType,
                ipAddress: "127.0.0.1",
                attemptedAt: new Date(),
                statusMessage: `[CRITICAL ERROR] ${message}`
            }).onConflictDoNothing();
        } catch (dbErr) {
            console.error("Failed to write system log to Postgres DB:", dbErr);
        }
    }

    /**
     * Invalidates current cache manually (useful if you dynamically add serials while server is running)
     */
    public static invalidateCache(): void {
        this.cachedSerials = null;
        this.cacheTimestamp = 0;
    }
}