import fs from 'fs';
import path from 'path';
import { decryptSerialNumber } from '../utils/cryptoUtils';

export class DeviceSecurityService {
    private static cachedSerials: Set<string> | null = null;
    private static cacheTimestamp: number = 0;
    private static readonly CACHE_TTL_MS = 60000; // 1 minute Cache Time-To-Live

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

        const filePath = path.join(process.cwd(), "server", "Config", "secure_serials.json");

        if (!fs.existsSync(filePath)) {
            console.error(`❌ [SECURITY LAYER ERROR] Critical secure serials file missing at: ${filePath}`);
            throw new Error("Device Verification Failed: Authorization policy file is missing.");
        }

        try {
            const rawJson = fs.readFileSync(filePath, "utf-8");
            const encryptedSerials: string[] = JSON.parse(rawJson);

            const decryptedList = new Set<string>();

            for (const cipherText of encryptedSerials) {
                const decrypted = decryptSerialNumber(cipherText).trim().toLowerCase();
                if (decrypted) {
                    decryptedList.add(decrypted);
                }
            }

            if (decryptedList.size === 0) {
                console.error("❌ [SECURITY LAYER ERROR] Decryption integrity check failed. Zero authorized devices loaded.");
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
            throw err;
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