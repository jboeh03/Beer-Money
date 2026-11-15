import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  apiKeyAad,
  decryptApiKey,
  encryptApiKey,
  formatKeyHint,
  maskApiKey,
  parseApiKeyInput,
  readEncryptionKey,
} from "./crypto";
import { keyStatusLabel } from "./status";
import { API_KEY_PROVIDERS, isApiKeyProvider } from "./providers";
import { runProviderProbe } from "./probe";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const owner = "11111111-1111-4111-8111-111111111111";
const otherOwner = "22222222-2222-4222-8222-222222222222";

test("masking keeps only the last four characters", () => {
  const secret = "sk-live-super-secret-value";
  assert.equal(maskApiKey(secret), "alue");
  assert.equal(formatKeyHint(maskApiKey(secret)), "••••alue");
  assert.equal(formatKeyHint(maskApiKey(secret)).includes("sk-live"), false);
  assert.equal(formatKeyHint(maskApiKey(secret)).includes("super"), false);
  assert.equal(formatKeyHint("not-four"), "••••••••");
  assert.equal(formatKeyHint(""), "••••••••");
});

test("key input rejects empty, short, oversized, and multiline values", () => {
  assert.deepEqual(parseApiKeyInput(""), { ok: false, reason: "empty" });
  assert.deepEqual(parseApiKeyInput("   "), { ok: false, reason: "empty" });
  assert.deepEqual(parseApiKeyInput("short"), { ok: false, reason: "too-short" });
  assert.deepEqual(parseApiKeyInput(`abcd1234\nNEXT`), { ok: false, reason: "invalid" });
  assert.deepEqual(parseApiKeyInput("a".repeat(513)), { ok: false, reason: "too-long" });
  assert.equal(parseApiKeyInput(12).ok, false);
  const accepted = parseApiKeyInput("  abcdefgh  ");
  assert.deepEqual(accepted, { ok: true, value: "abcdefgh" });
  assert.throws(() => maskApiKey("   "), /invalid API key/i);
});

test("encrypt and decrypt round-trip without storing the key in the blob", () => {
  const key = randomBytes(32);
  const plaintext = "sk-live-super-secret-value";
  const aad = apiKeyAad(owner, "gemini");
  const sealed = encryptApiKey(plaintext, key, aad);

  assert.equal(decryptApiKey(sealed, key, aad), plaintext);
  assert.equal(sealed.keyHint, "alue");
  assert.equal(sealed.ciphertext.includes(plaintext), false);
  assert.equal(sealed.iv.includes(plaintext), false);
  assert.equal(sealed.authTag.includes(plaintext), false);

  const again = encryptApiKey(plaintext, key, aad);
  assert.notEqual(again.iv, sealed.iv);
  assert.notEqual(again.ciphertext, sealed.ciphertext);
});

test("decrypt rejects a tampered blob, the wrong key, and a copied row", () => {
  const key = randomBytes(32);
  const plaintext = "sk-live-super-secret-value";
  const aad = apiKeyAad(owner, "gemini");
  const sealed = encryptApiKey(plaintext, key, aad);
  const flipped = Buffer.from(sealed.ciphertext, "base64");
  flipped[0] ^= 0xff;

  assert.throws(
    () => decryptApiKey({ ...sealed, ciphertext: flipped.toString("base64") }, key, aad),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(plaintext), false);
      return true;
    },
  );
  assert.throws(() => decryptApiKey(sealed, randomBytes(32), aad));
  assert.throws(() => decryptApiKey(sealed, key, apiKeyAad(otherOwner, "gemini")));
  assert.throws(() => decryptApiKey(sealed, key, apiKeyAad(owner, "openai")));
  assert.throws(() => apiKeyAad("not-a-user", "gemini"));
  assert.throws(() => apiKeyAad(owner, "unknown"));
});

test("encryption key must be 32 bytes of base64", () => {
  const encoded = randomBytes(32).toString("base64");
  assert.equal(readEncryptionKey(encoded).equals(Buffer.from(encoded, "base64")), true);
  assert.throws(() => readEncryptionKey(undefined), /not set/);
  assert.throws(() => readEncryptionKey("   "), /not set/);
  assert.throws(() => readEncryptionKey(randomBytes(16).toString("base64")), /32 bytes/);
  assert.throws(() => readEncryptionKey("@@@@not-base64@@@@"), /32 bytes/);
});

test("providers stay in one list, Gemini first, with cheap read-only tests", () => {
  assert.deepEqual(
    API_KEY_PROVIDERS.map((provider) => provider.id),
    ["gemini", "openai", "anthropic", "xai", "firecrawl", "higgsfield"],
  );
  assert.deepEqual(
    API_KEY_PROVIDERS.map((provider) => provider.label),
    ["Google Gemini", "OpenAI", "Anthropic", "xAI (Grok)", "Firecrawl", "Higgsfield"],
  );
  assert.equal(isApiKeyProvider("gemini"), true);
  assert.equal(isApiKeyProvider("Gemini"), false);

  const gemini = API_KEY_PROVIDERS[0];
  assert.equal(gemini?.test.kind, "get");
  if (gemini?.test.kind === "get") {
    assert.equal(gemini.test.url, "https://generativelanguage.googleapis.com/v1beta/models");
    assert.deepEqual(gemini.test.headers("secret-value"), { "x-goog-api-key": "secret-value" });
  }

  const secret = "super-secret-key-value";
  for (const provider of API_KEY_PROVIDERS) {
    if (provider.test.kind !== "get") continue;
    assert.equal(provider.test.url.includes(secret), false);
    assert.equal(provider.test.url.includes("key="), false);
    assert.equal(provider.test.url.startsWith("https://"), true);
    const headers = provider.test.headers(secret);
    assert.ok(Object.values(headers).some((value) => value.includes(secret)));
  }

  assert.equal(API_KEY_PROVIDERS.find((provider) => provider.id === "firecrawl")?.test.kind, "none");
  assert.equal(API_KEY_PROVIDERS.find((provider) => provider.id === "higgsfield")?.test.kind, "none");
  assert.equal(API_KEY_PROVIDERS.find((provider) => provider.id === "openai")?.test.kind, "get");
  assert.equal(API_KEY_PROVIDERS.find((provider) => provider.id === "anthropic")?.test.kind, "get");
  assert.equal(API_KEY_PROVIDERS.find((provider) => provider.id === "xai")?.test.kind, "get");
});

test("status copy distinguishes an untested provider from a failed test", () => {
  assert.equal(keyStatusLabel(null, true), "No key saved");
  assert.equal(keyStatusLabel({ lastTestedAt: null, lastTestOk: null }, false), "Saved (not tested)");
  assert.equal(keyStatusLabel({ lastTestedAt: null, lastTestOk: null }, true), "Not tested");
  assert.equal(keyStatusLabel({ lastTestedAt: "2026-11-15T00:00:00.000Z", lastTestOk: true }, true), "Passed");
  assert.equal(keyStatusLabel({ lastTestedAt: "2026-11-15T00:00:00.000Z", lastTestOk: false }, true), "Failed");
});

test("a provider probe is a header-authenticated GET and does not follow redirects", async () => {
  const gemini = API_KEY_PROVIDERS[0];
  assert.ok(gemini);
  const seen = {
    url: "",
    method: "",
    header: "",
    redirect: "follow" as RequestRedirect,
  };
  const ok = await runProviderProbe(gemini, "secret-value", async (url, init) => {
    seen.url = String(url);
    seen.method = init?.method ?? "GET";
    seen.header = new Headers(init?.headers).get("x-goog-api-key") ?? "";
    seen.redirect = init?.redirect ?? "follow";
    return new Response("[]", { status: 200 });
  });
  assert.equal(ok.tested, true);
  assert.equal(ok.ok, true);
  assert.equal(seen.url, "https://generativelanguage.googleapis.com/v1beta/models");
  assert.equal(seen.url.includes("secret-value"), false);
  assert.equal(seen.method, "GET");
  assert.equal(seen.header, "secret-value");
  assert.equal(seen.redirect, "manual");

  const failed = await runProviderProbe(gemini, "secret-value", async () => new Response("", { status: 401 }));
  assert.deepEqual(failed, { tested: true, ok: false });

  const thrown = await runProviderProbe(gemini, "secret-value", async () => {
    throw new Error("secret-value should not leak");
  });
  assert.deepEqual(thrown, { tested: true, ok: false });

  const firecrawl = API_KEY_PROVIDERS.find((provider) => provider.id === "firecrawl");
  assert.ok(firecrawl);
  let called = false;
  const skipped = await runProviderProbe(firecrawl, "secret-value", async () => {
    called = true;
    return new Response("");
  });
  assert.equal(called, false);
  assert.deepEqual(skipped, { tested: false });
});

test("user_api_keys migration hides ciphertext and forces RLS", () => {
  const migrations = path.join(root, "supabase/migrations");
  const files = readdirSync(migrations).filter((name) => name.endsWith(".sql") && name.includes("user_api_keys"));
  assert.equal(files.length, 1);
  const filename = files[0] ?? "";
  assert.ok(filename > "20261115223000", filename);
  const sql = readFileSync(path.join(migrations, filename), "utf8").toLowerCase();

  assert.match(sql, /create table public\.user_api_keys/);
  assert.match(sql, /user_id uuid not null references auth\.users/);
  assert.match(sql, /provider text not null/);
  assert.match(sql, /ciphertext text not null/);
  assert.match(sql, /iv text not null/);
  assert.match(sql, /auth_tag text not null/);
  assert.match(sql, /key_hint text not null/);
  assert.match(sql, /created_at timestamptz/);
  assert.match(sql, /updated_at timestamptz/);
  assert.match(sql, /last_tested_at timestamptz/);
  assert.match(sql, /last_test_ok boolean/);
  assert.match(sql, /unique \(user_id, provider\)|primary key \(user_id, provider\)/);
  assert.match(sql, /alter table public\.user_api_keys enable row level security/);
  assert.match(sql, /alter table public\.user_api_keys force row level security/);
  assert.match(sql, /revoke all on table public\.user_api_keys from public, anon, authenticated/);
  assert.match(sql, /grant select \(\s*user_id/);
  assert.equal(sql.includes("ciphertext") && sql.includes("grant select ("), true);
  assert.equal(/grant select \([^)]*ciphertext/.test(sql), false);
  assert.equal(/grant select \([^)]*auth_tag/.test(sql), false);
  assert.match(sql, /to authenticated/);
  assert.match(sql, /grant select, insert, update, delete on table public\.user_api_keys to service_role/);
  assert.equal(/grant (select|insert|update|delete)[^;]*user_api_keys to anon/.test(sql), false);
  assert.match(sql, /create view public\.user_api_keys_safe/);
  assert.match(sql, /security_invoker\s*=\s*true/);
  assert.equal(/insert|update|delete/.test(sql.split("create view")[1] ?? "") && /grant insert|grant update|grant delete/.test(sql.split("user_api_keys_safe")[1] ?? ""), false);

  for (const id of ["gemini", "openai", "anthropic", "xai", "firecrawl", "higgsfield"]) {
    assert.match(sql, new RegExp(`'${id}'`));
  }
  assert.match(sql, /for select/);
  assert.equal(/for insert/.test(sql), false);
  assert.equal(/for update/.test(sql), false);
  assert.equal(/for delete/.test(sql), false);
});

test("the encryption env name is server-only and documented", () => {
  const example = readFileSync(path.join(root, ".env.example"), "utf8");
  assert.match(example, /^API_KEYS_ENCRYPTION_KEY=$/m);
  assert.match(example, /openssl rand -base64 32/);
  assert.equal(example.includes("NEXT_PUBLIC_API_KEYS"), false);

  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|mjs)$/.test(entry) || entry.endsWith(".test.ts")) continue;
      const text = readFileSync(full, "utf8");
      if (text.includes("NEXT_PUBLIC_API_KEYS")) offenders.push(path.relative(root, full));
      const client = text.includes('"use client"') || text.includes("'use client'");
      if (
        client &&
        /API_KEYS_ENCRYPTION_KEY|api-keys\/crypto|api-keys\/get-user-api-key|api-keys\/probe/.test(text)
      ) {
        offenders.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, "src"));
  assert.deepEqual(offenders, []);
});

test("api key modules do not log", () => {
  const files = [
    ...readdirSync(path.join(root, "src/lib/api-keys")).map((name) => path.join(root, "src/lib/api-keys", name)),
    path.join(root, "src/app/settings/api-keys/actions.ts"),
  ];
  for (const file of files) {
    if (file.endsWith(".test.ts")) continue;
    const text = readFileSync(file, "utf8");
    assert.equal(/console\.(log|debug|info|warn|error|dir)/.test(text), false, file);
  }
});
