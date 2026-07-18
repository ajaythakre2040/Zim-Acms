import fs from 'fs';
import path from 'path';
import { decryptSerialNumber } from '../utils/cryptoUtils';
import { db } from '../db';
import { unauthorizedDeviceLogs } from '../../shared/schema';

export class DeviceSecurityService {
    /**
     * JSON file se encrypted serials load karke, unhe decrypt aur normalize karke return karta hai.
     */
    public static getAuthorizedSerials(): Set<string> {
        const filePath = path.join(process.cwd(), "server", "Config", "secure_serials.json");
        const authorizedSet = new Set<string>();

        if (!fs.existsSync(filePath)) {
            console.error(`❌ [SECURITY] Config file missing at: ${filePath}`);
            return authorizedSet;
        }

        try {
            const rawJson = fs.readFileSync(filePath, "utf-8");
            const encryptedList: string[] = JSON.parse(rawJson);

            for (const cipherText of encryptedList) {
                const decrypted = decryptSerialNumber(cipherText);
                if (decrypted) {
                    authorizedSet.add(decrypted); // Set me clean lowercase serial add hoga
                }
            }
        } catch (error) {
            console.error("❌ [SECURITY] Error reading or parsing secure_serials.json:", error);
        }

        return authorizedSet;
    }

    /**
     * DB se aaye devices ko authorized serials se match karta hai.
     * Jo match nahi hote unhe block/log karta hai.
     */
    public static async filterAndValidateDevices(incomingDevices: any[]): Promise<any[]> {
        const authorizedSerials = this.getAuthorizedSerials();
        const allowedDevices: any[] = [];
        let unauthorizedCount = 0;

        for (const device of incomingDevices) {
            // Incoming device ka serial number clean karein
            const incomingSerial = (device.serialNumber || device.serial_number || "").toString().trim().toLowerCase();

            if (authorizedSerials.has(incomingSerial)) {
                // Agar match ho gaya toh device safe hai
                allowedDevices.push(device);
            } else {
                unauthorizedCount++;
                // Match nahi hua to block aur log karein
                console.warn(`⚠️ [SECURITY LAYER] Blocked unauthorized device sync: ${device.deviceName || 'Unknown'} (${incomingSerial})`);
                await this.logUnauthorizedAttempt(device, incomingSerial);
            }
        }

        // Agar processing bina kisi fatal security breakdown ke puri ho jati hai:
        if (allowedDevices.length > 0) {
            console.log(`✅ [SECURITY] Devices validated and synced successfully! [Allowed: ${allowedDevices.length}, Blocked: ${unauthorizedCount}]`);
        } else {
            console.log(`⚠️ [SECURITY] Sync execution cycle completed. No authorized devices were detected.`);
        }

        return allowedDevices;
    }

    /**
     * Unauthorized device ka log DB me save karne ke liye helper
     */
    private static async logUnauthorizedAttempt(device: any, serial: string) {
        try {
            await db.insert(unauthorizedDeviceLogs).values({
                deviceId: device.id || device.deviceId || 0,
                deviceName: device.deviceName || device.name || "Unknown Device",
                serialNumber: serial || "UNKNOWN_SERIAL",
                ipAddress: device.ipAddress || device.ip || "127.0.0.1",
                attemptedAt: new Date(),
                statusMessage: "Device Serial Number not found in secure_serials.json configuration."
            });
        } catch (dbErr) {
            console.error("❌ Failed to write unauthorized log to DB:", dbErr);
        }
    }
}