import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { apiKeyAad, decryptApiKey, encryptApiKey, readEncryptionKey } from "@/lib/api-keys/crypto";
import { runProviderProbe } from "@/lib/api-keys/probe";
import { API_KEY_PROVIDERS, isApiKeyProvider } from "@/lib/api-keys/providers";

const USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredKeyTestResult = "passed" | "failed" | "untested" | "missing";

export class ApiKeyStoreError extends Error {
  constructor(message: "rejected" | "unavailable" | "not-ready") {
    super(message);
    this.name = "ApiKeyStoreError";
  }
}

function encryptionKey() {
  try {
    return readEncryptionKey(process.env.API_KEYS_ENCRYPTION_KEY);
  } catch {
    throw new ApiKeyStoreError("unavailable");
  }
}

function assertOwner(userId: string, provider: string) {
  if (!USER_ID.test(userId) || !isApiKeyProvider(provider)) {
    throw new ApiKeyStoreError("rejected");
  }
}

function mapDbError(error: { code?: string; message?: string }): ApiKeyStoreError {
  const missing =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /schema cache/i.test(error.message ?? "") ||
    /does not exist/i.test(error.message ?? "");
  return new ApiKeyStoreError(missing ? "not-ready" : "unavailable");
}

async function readSecret(userId: string, provider: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("ciphertext, iv, auth_tag")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) {
    throw mapDbError(error);
  }
  return data;
}

// Server-only. Pass the authenticated user id. Do not log the return value.
export async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  assertOwner(userId, provider);
  const row = await readSecret(userId, provider);
  if (!row) {
    return null;
  }
  try {
    return decryptApiKey(
      { ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag },
      encryptionKey(),
      apiKeyAad(userId, provider),
    );
  } catch (error) {
    if (error instanceof ApiKeyStoreError) {
      throw error;
    }
    throw new ApiKeyStoreError("unavailable");
  }
}

export async function saveUserApiKey(userId: string, provider: string, plaintext: string): Promise<void> {
  assertOwner(userId, provider);
  let sealed;
  try {
    sealed = encryptApiKey(plaintext, encryptionKey(), apiKeyAad(userId, provider));
  } catch (error) {
    if (error instanceof ApiKeyStoreError) {
      throw error;
    }
    throw new ApiKeyStoreError("rejected");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("user_api_keys").upsert(
    {
      user_id: userId,
      provider,
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      auth_tag: sealed.authTag,
      key_hint: sealed.keyHint,
      updated_at: new Date().toISOString(),
      last_tested_at: null,
      last_test_ok: null,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) {
    throw mapDbError(error);
  }
}

export async function deleteUserApiKey(userId: string, provider: string): Promise<void> {
  assertOwner(userId, provider);
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) {
    throw mapDbError(error);
  }
}

export async function testStoredApiKey(userId: string, providerId: string): Promise<StoredKeyTestResult> {
  assertOwner(userId, providerId);
  const provider = API_KEY_PROVIDERS.find((item) => item.id === providerId);
  if (!provider) {
    throw new ApiKeyStoreError("rejected");
  }
  if (provider.test.kind === "none") {
    return "untested";
  }

  const apiKey = await getUserApiKey(userId, providerId);
  if (!apiKey) {
    return "missing";
  }

  const probe = await runProviderProbe(provider, apiKey);
  const ok = probe.tested && probe.ok;
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("user_api_keys")
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_ok: ok,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", providerId);
  if (error) {
    throw mapDbError(error);
  }
  return ok ? "passed" : "failed";
}
