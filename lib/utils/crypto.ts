import {
  createDecipheriv,
  createCipheriv,
  randomBytes,
  createHash,
} from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  console.log("[CRYPTO] Starting token decryption");
  console.log("[CRYPTO] Payload length:", payload?.length || 0);
  
  try {
    if (!payload) {
      throw new Error("Empty payload provided for decryption");
    }
    
    // Check if SESSION_SECRET is available
    const key = getKey();
    console.log("[CRYPTO] Encryption key generated successfully, length:", key.length);
    
    const buffer = Buffer.from(payload, "base64");
    console.log("[CRYPTO] Buffer created from payload, length:", buffer.length);
    
    if (buffer.length < 28) {
      throw new Error(`Invalid payload length: ${buffer.length}. Expected at least 28 bytes (12 IV + 16 tag + data)`);
    }
    
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const data = buffer.subarray(28);
    
    console.log("[CRYPTO] IV length:", iv.length);
    console.log("[CRYPTO] Tag length:", tag.length);
    console.log("[CRYPTO] Data length:", data.length);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    const result = decrypted.toString("utf8");
    
    console.log("[CRYPTO] Decryption successful, result length:", result.length);
    console.log("[CRYPTO] Result starts with:", result.substring(0, 10) + "...");
    
    return result;
  } catch (error) {
    console.error("[CRYPTO] Decryption failed:", error);
    console.error("[CRYPTO] Error type:", error.constructor.name);
    console.error("[CRYPTO] Error message:", error.message);
    throw new Error(`Failed to decrypt GitHub token: ${error.message}`);
  }
}
