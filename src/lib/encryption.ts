import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_should_be_32_chars_long_!!'; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

// Cache the derived key to avoid expensive scryptSync calls on every operation
let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (!cachedKey) {
    cachedKey = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  }
  return cachedKey;
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text) return text;
  
  // Check if text matches encrypted format (hex:hex)
  // Basic validation: contains a colon and parts are likely hex
  if (!text.includes(':')) {
    return text;
  }

  try {
    const textParts = text.split(':');
    const ivPart = textParts.shift();
    
    if (!ivPart) return text;

    const iv = Buffer.from(ivPart, 'hex');
    
    // Validate IV length (AES-256-CBC requires 16 bytes)
    if (iv.length !== IV_LENGTH) {
        // If IV length is incorrect, it's likely not an encrypted string (e.g. plain text with colons)
        return text;
    }

    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    // If decryption fails, assume it might be plain text or corrupted
    // For migration purposes, returning original text is safer for data availability
    // though strictly implies a security trade-off during transition.
    console.warn('Decryption failed, returning original text:', error);
    return text;
  }
}
