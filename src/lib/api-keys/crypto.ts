import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { isApiKeyProvider } from "./providers";

const MIN_LENGTH = 8;
const MAX_LENGTH = 512;
const USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type KeyInputResult =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "too-short" | "too-long" | "invalid" };

export type EncryptedApiKey = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyHint: string;
};

export function parseApiKeyInput(input: unknown): KeyInputResult {
  if (typeof input !== "string") {
    return { ok: false, reason: "invalid" };
  }
  const value = input.trim();
  if (value.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (!/^[\x21-\x7E]+$/.test(value)) {
    return { ok: false, reason: "invalid" };
  }
  if (value.length < MIN_LENGTH) {
    return { ok: false, reason: "too-short" };
  }
  if (value.length > MAX_LENGTH) {
    return { ok: false, reason: "too-long" };
  }
  return { ok: true, value };
}

export function maskApiKey(secret: string): string {
  const parsed = parseApiKeyInput(secret);
  if (!parsed.ok) {
    throw new Error("Cannot mask an invalid API key");
  }
  return parsed.value.slice(-4);
}

export function formatKeyHint(hint: string): string {
  if (!/^[\x21-\x7E]{4}$/.test(hint)) {
    return "••••••••";
  }
  return `••••${hint}`;
}

export function apiKeyAad(userId: string, provider: string): string {
  if (!USER_ID.test(userId)) {
    throw new Error("API key owner is invalid");
  }
  if (!isApiKeyProvider(provider)) {
    throw new Error("API key provider is invalid");
  }
  return `user_api_keys\0${userId}\0${provider}`;
}

export function readEncryptionKey(encoded: string | undefined): Buffer {
  if (typeof encoded !== "string" || encoded.trim() === "") {
    throw new Error("API_KEYS_ENCRYPTION_KEY is not set");
  }
  const trimmed = encoded.trim();
  if (/\s/.test(trimmed)) {
    throw new Error("API_KEYS_ENCRYPTION_KEY must be 32 bytes of base64");
  }
  const key = Buffer.from(trimmed, "base64");
  const canonical = key.toString("base64").replace(/=+$/, "");
  const given = trimmed.replace(/=+$/, "");
  if (key.length !== 32 || canonical !== given) {
    throw new Error("API_KEYS_ENCRYPTION_KEY must be 32 bytes of base64");
  }
  return key;
}

function assertAesKey(key: Buffer) {
  if (key.length !== 32) {
    throw new Error("API key encryption key must be 32 bytes");
  }
}

export function encryptApiKey(plaintext: string, key: Buffer, aad: string): EncryptedApiKey {
  const parsed = parseApiKeyInput(plaintext);
  if (!parsed.ok) {
    throw new Error("Cannot encrypt an invalid API key");
  }
  assertAesKey(key);
  if (aad.length === 0) {
    throw new Error("API key encryption is missing its owner");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(parsed.value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyHint: parsed.value.slice(-4),
  };
}

export function decryptApiKey(
  payload: { ciphertext: string; iv: string; authTag: string },
  key: Buffer,
  aad: string,
): string {
  assertAesKey(key);
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0 || aad.length === 0) {
    throw new Error("API key could not be decrypted");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed = parseApiKeyInput(plaintext);
    if (!parsed.ok) {
      throw new Error("API key could not be decrypted");
    }
    return parsed.value;
  } catch (error) {
    if (error instanceof Error && error.message === "API key could not be decrypted") {
      throw error;
    }
    throw new Error("API key could not be decrypted");
  }
}
