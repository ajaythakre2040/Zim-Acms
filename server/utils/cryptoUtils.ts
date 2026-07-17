import crypto from 'crypto';

/**
 * Decrypts an AES-256-CBC encrypted serial number string.
 * Expected format: "iv_hex:encrypted_data_hex"
 */
export function decryptSerialNumber(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(':')) {
        return "";
    }

    try {
        // 1. Read and trim .env key to remove any accidental spaces/newlines
        const rawKey = process.env.DEVICE_CRYPTO_KEY;
        if (!rawKey) {
            console.error("[CRYPTO ERROR] DEVICE_CRYPTO_KEY is missing in environment variables.");
            return "";
        }

        // String clean-up: quotes aur whitespace trim karein
        const ENCRYPTION_KEY = rawKey.replace(/['"]/g, '').trim();

        // 2. Strict 32-byte key buffer creation
        const keyBuffer = Buffer.alloc(32);
        const sourceBuffer = Buffer.from(ENCRYPTION_KEY, 'utf-8');

        // Copy source bytes into our safe 32-byte allocated buffer
        sourceBuffer.copy(keyBuffer, 0, 0, Math.min(sourceBuffer.length, 32));

        // 3. Parse IV and CipherText
        const [ivHex, cipherHex] = encryptedText.split(':');
        if (!ivHex || !cipherHex) {
            return "";
        }

        const iv = Buffer.from(ivHex.trim(), 'hex');
        const encryptedBuffer = Buffer.from(cipherHex.trim(), 'hex');

        if (iv.length !== 16) {
            console.error("[CRYPTO ERROR] IV length is invalid. Expected 16 bytes.");
            return "";
        }

        // 4. Decryption process
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);

        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8').trim(); // Output ko bhi trim karke clean string return karein
    } catch (error: unknown) {
        const err = error as Error;
        console.error(`[CRYPTO ERROR] Decryption failed! Error: ${err.message}`);
        return "";
    }
}