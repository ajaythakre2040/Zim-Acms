import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// ध्यान दें: सुनिश्चित करें कि यह KEY ठीक 32 बाइट्स की हो। 
const RAW_KEY = process.env.DEVICE_CRYPTO_KEY || 'abcdefghijklmnopqrstuvwxyz123456'; 

/**
 * सटीक 32-बाइट की (Key) बफ़र तैयार करने के लिए सहायक फ़ंक्शन
 */
function getKeyBuffer(): Buffer {
  const rawBuffer = Buffer.from(RAW_KEY, 'utf-8');
  if (rawBuffer.length === 32) {
    return rawBuffer;
  }
  const keyBuffer = Buffer.alloc(32);
  rawBuffer.copy(keyBuffer, 0, 0, Math.min(rawBuffer.length, 32));
  return keyBuffer;
}

/**
 * 1. ENCRYPT FUNCTION (Named Export)
 * सीरियल नंबर को 'IV:Cipher' पैटर्न में एन्क्रिप्ट करता है
 */
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

/**
 * 2. DECRYPT FUNCTION (Named Export) - यही इम्पोर्ट एरर दे रहा था!
 * यह 'IV:Cipher' फॉर्मेट को डिक्रिप्ट करके असली सीरियल नंबर लौटाता है
 */
export function decryptSerialNumber(cipherText: string): string | null {
  if (!cipherText) {
    console.log(`[CRYPTO] Skip decrypt: cipherText is empty.`);
    return null;
  }

  // अगर डेटा में कोलन ':' नहीं है, तो डिक्रिप्ट नहीं किया जा सकता
  if (!cipherText.includes(':')) {
    console.log(`[CRYPTO] Skip decrypt: Invalid token format (missing ':').`);
    return null;
  }

  try {
    const [ivHex, encryptedHex] = cipherText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const key = getKeyBuffer();

    if (iv.length !== 16) {
      console.log(`[CRYPTO] Skip decrypt: IV length is invalid.`);
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error: any) {
    console.error(`[CRYPTO] Decryption failed for token. Error:`, error.message);
    return null;
  }
}