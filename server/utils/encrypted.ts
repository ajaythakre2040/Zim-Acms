import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// -------------------------------------------------------------
// ES Modules (__dirname fix)
// -------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encryption Config & Logic
const ALGORITHM = 'aes-256-cbc';
const RAW_KEY = process.env.DEVICE_CRYPTO_KEY || 'abcdefghijklmnopqrstuvwxyz123456';

function getKeyBuffer(): Buffer {
  const rawBuffer = Buffer.from(RAW_KEY, 'utf-8');
  if (rawBuffer.length === 32) {
    return rawBuffer;
  }
  const keyBuffer = Buffer.alloc(32);
  rawBuffer.copy(keyBuffer, 0, 0, Math.min(rawBuffer.length, 32));
  return keyBuffer;
}

export function encryptSerialNumber(plainText: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = getKeyBuffer();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err: any) {
    console.error(`[CRYPTO] Encryption failed:`, err.message);
    throw err;
  }
}

// Interfaces
interface PlainConfigItem {
  serial_no: string;
  vendor_status: boolean;
}

interface EncryptedConfigItem {
  encrypted_serial: string;
  vendor_status: boolean;
}

// Main Execution
function generateEncryptedConfigFile() {
  try {
    const plainPath = path.join(__dirname, '../config/serials.json');
    const encryptedPath = path.join(__dirname, '../config/encrypted_serials.json');

    if (!fs.existsSync(plainPath)) {
      console.error("❌ Error: 'config/serials.json' file not found!");
      return;
    }

    // 1. Plain JSON read karo
    const rawData = fs.readFileSync(plainPath, 'utf-8');
    const plainList: PlainConfigItem[] = JSON.parse(rawData);

    // 2. Clear old data & Encrypt each item
    const encryptedList: EncryptedConfigItem[] = [];

    for (const item of plainList) {
      if (item.serial_no && item.vendor_status === true) {
        const cleanSerial = item.serial_no
          .trim()
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, '');

        const token = encryptSerialNumber(cleanSerial);

        encryptedList.push({
          encrypted_serial: token,
          vendor_status: item.vendor_status,
        });
      }
    }

    // 3. Complete File Overwrite
    fs.writeFileSync(
      encryptedPath,
      JSON.stringify(encryptedList, null, 2),
      { encoding: 'utf-8', flag: 'w' }
    );

    console.log(`✅ Success! Generated ${encryptedList.length} items in 'encrypted_serials.json'.`);
  } catch (error: any) {
    console.error('❌ Encryption script failed:', error.message);
  }
}

// Auto-run script
generateEncryptedConfigFile();