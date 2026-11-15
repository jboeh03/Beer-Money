import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { generateVAPIDKeys } from "web-push";
import { urlBase64ToBytes } from "./bytes";
import { deliverToSubscriptions, deliveryErrorText } from "./deliver";
import { isIosDevice, notificationAvailability } from "./device";
import { notifyGate } from "./gate";
import { parseNotifyRequest } from "./message";
import { secretMatches } from "./secret";
import { parseClientSubscription } from "./subscription";
import { readVapidConfig } from "./vapid";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("secret comparison accepts only the exact secret", () => {
  assert.equal(secretMatches("correct horse", "correct horse"), true);
  assert.equal(secretMatches("correct horse", "correct horse "), false);
  assert.equal(secretMatches("short", "a-much-longer-secret"), false);
  assert.equal(secretMatches("", "secret"), false);
  assert.equal(secretMatches("secret", ""), false);
});

test("notify route stays closed until the secret and VAPID config exist", () => {
  assert.deepEqual(notifyGate({ configuredSecret: undefined, header: null, vapidReady: true }), {
    status: 503,
  });
  assert.deepEqual(notifyGate({ configuredSecret: "s3cret", header: null, vapidReady: true }), {
    status: 401,
  });
  assert.deepEqual(notifyGate({ configuredSecret: "s3cret", header: "nope", vapidReady: true }), {
    status: 401,
  });
  assert.deepEqual(notifyGate({ configuredSecret: "s3cret", header: "s3cret", vapidReady: false }), {
    status: 503,
  });
  assert.deepEqual(notifyGate({ configuredSecret: "s3cret", header: "s3cret", vapidReady: true }), {
    status: 200,
  });
});

test("notify payload accepts a reminder and rejects claim-shaped URLs", () => {
  assert.deepEqual(
    parseNotifyRequest({
      title: " Shuffle.us daily bonus ready ",
      body: "Open Beer Money and claim it yourself.",
      url: "/today",
      source: "shuffle",
    }),
    {
      ok: true,
      message: {
        title: "Shuffle.us daily bonus ready",
        body: "Open Beer Money and claim it yourself.",
        url: "/today",
        source: "shuffle",
      },
    },
  );

  assert.equal(parseNotifyRequest({ title: "  " }).ok, false);
  assert.equal(parseNotifyRequest({ title: "x".repeat(121) }).ok, false);
  assert.equal(parseNotifyRequest(["title"]).ok, false);
  assert.equal(parseNotifyRequest({ title: "Ready", url: "javascript:alert(1)" }).ok, false);
  assert.equal(parseNotifyRequest({ title: "Ready", url: "//evil.example" }).ok, false);
  assert.equal(parseNotifyRequest({ title: "Ready", url: "http://shuffle.example/bonus" }).ok, false);
  assert.equal(parseNotifyRequest({ title: "Ready", url: "https://user:pass@shuffle.example/bonus" }).ok, false);

  const https = parseNotifyRequest({
    title: "Ready",
    url: "https://shuffle.example/bonus",
    body: "",
    source: "",
  });
  assert.equal(https.ok, true);
  if (https.ok) {
    assert.equal(https.message.url, "https://shuffle.example/bonus");
    assert.equal(https.message.body, null);
    assert.equal(https.message.source, null);
  }

  const local = parseNotifyRequest({ title: "Ready", url: "http://localhost:3000/today" });
  assert.equal(local.ok, true);
});

test("a saved subscription must be an https push endpoint with keys", () => {
  const keys = { p256dh: "A".repeat(80), auth: "B".repeat(22) };
  const parsed = parseClientSubscription({
    endpoint: "https://web.push.apple.com/device",
    keys,
  });
  assert.deepEqual(parsed, {
    ok: true,
    subscription: {
      endpoint: "https://web.push.apple.com/device",
      p256dh: "A".repeat(80),
      auth: "B".repeat(22),
    },
  });
  assert.equal(parseClientSubscription({ endpoint: "http://evil.example/push", keys }).ok, false);
  assert.equal(
    parseClientSubscription({ endpoint: "http://localhost:3000/push", keys }).ok,
    true,
  );
  assert.equal(parseClientSubscription({ endpoint: "https://push.example/a", keys: { p256dh: "bad key", auth: "B".repeat(22) } }).ok, false);
});

test("delivery prunes expired endpoints and does not echo them", async () => {
  let payload = "";
  const report = await deliverToSubscriptions(
    [
      { endpoint: "https://push.example/ok", p256dh: "p", auth: "a" },
      { endpoint: "https://push.example/secret-endpoint", p256dh: "p", auth: "a" },
      { endpoint: "https://push.example/down", p256dh: "p", auth: "a" },
    ],
    { title: "Shuffle.us daily bonus ready", body: "Open it", url: "/today" },
    async (target, body) => {
      payload = body;
      if (target.endpoint.endsWith("secret-endpoint")) {
        throw Object.assign(new Error("gone"), { statusCode: 410 });
      }
      if (target.endpoint.endsWith("down")) {
        throw Object.assign(new Error("nope"), { statusCode: 500 });
      }
    },
  );

  assert.deepEqual(JSON.parse(payload), {
    title: "Shuffle.us daily bonus ready",
    body: "Open it",
    url: "/today",
  });
  assert.deepEqual(report.sent, ["https://push.example/ok"]);
  assert.deepEqual(report.pruned, ["https://push.example/secret-endpoint"]);
  assert.equal(report.failed.length, 1);
  assert.equal(report.failed[0]?.status, 500);
  const text = deliveryErrorText(report);
  assert.ok(text);
  assert.equal(text.includes("secret-endpoint"), false);
  assert.equal(text.includes("https://"), false);
});

test("404 subscriptions are pruned the same way as 410", async () => {
  const report = await deliverToSubscriptions(
    [{ endpoint: "https://push.example/missing", p256dh: "p", auth: "a" }],
    { title: "Ready", body: null, url: null },
    async () => {
      throw Object.assign(new Error("missing"), { statusCode: 404 });
    },
  );
  assert.deepEqual(report.pruned, ["https://push.example/missing"]);
  assert.equal(report.sent.length, 0);
});

test("iPhone web push is limited to the installed app", () => {
  const iphone = {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    platform: "iPhone",
    maxTouchPoints: 5,
  };
  assert.equal(isIosDevice(iphone), true);
  assert.equal(
    notificationAvailability({ ...iphone, standalone: false, pushSupported: false }),
    "needs-home-screen",
  );
  assert.equal(
    notificationAvailability({ ...iphone, standalone: true, pushSupported: true }),
    "ready",
  );
  assert.equal(
    notificationAvailability({ ...iphone, standalone: true, pushSupported: false }),
    "unsupported",
  );
  assert.equal(
    isIosDevice({ userAgent: "Mozilla/5.0", platform: "MacIntel", maxTouchPoints: 5 }),
    true,
  );
  assert.equal(
    notificationAvailability({
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      platform: "Linux",
      maxTouchPoints: 0,
      standalone: false,
      pushSupported: true,
    }),
    "ready",
  );
});

test("VAPID config stays on the private env names", () => {
  const { publicKey, privateKey } = generateVAPIDKeys();
  const ready = readVapidConfig({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_SUBJECT: "mailto:owner@example.com",
  });
  assert.equal(ready.ok, true);
  assert.equal(readVapidConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey }).ok, false);
  assert.equal(
    readVapidConfig({
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: privateKey,
      VAPID_SUBJECT: "http://example.com",
    }).ok,
    false,
  );
  assert.equal(urlBase64ToBytes(publicKey)?.length, 65);
  assert.equal(urlBase64ToBytes("not a key"), null);
});

test("client code cannot see server push secrets", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js)$/.test(entry) || entry.endsWith(".test.ts")) continue;
      const text = readFileSync(full, "utf8");
      if (!text.includes('"use client"') && !text.includes("'use client'")) continue;
      if (/VAPID_PRIVATE_KEY|NOTIFY_SECRET|SERVICE_ROLE|service-role|API_KEYS_ENCRYPTION_KEY/.test(text)) {
        offenders.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, "src"));
  assert.deepEqual(offenders, []);
});

test("the service role client stays on server-only secret paths", () => {
  const importers: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry) || entry.endsWith(".test.ts")) continue;
      const text = readFileSync(full, "utf8");
      if (text.includes("supabase/service-role") || text.includes("createServiceRoleClient")) {
        importers.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  walk(path.join(root, "src"));
  assert.deepEqual(importers.sort(), [
    "src/lib/api-keys/get-user-api-key.ts",
    "src/lib/push/broadcast.ts",
    "src/lib/supabase/service-role.ts",
  ]);
});

test("the service worker opens the tapped URL and does not cache", () => {
  const source = readFileSync(path.join(root, "public/sw.js"), "utf8");
  assert.match(source, /addEventListener\(\s*["']push["']/);
  assert.match(source, /addEventListener\(\s*["']notificationclick["']/);
  assert.match(source, /openWindow/);
  assert.match(source, /focus/);
  assert.equal(source.includes("caches"), false);
  assert.equal(/addEventListener\(\s*["']fetch["']/.test(source), false);
});

test("push tables are owner-only and the notify functions are not public", () => {
  const migrations = path.join(root, "supabase/migrations");
  const file = readdirSync(migrations).find((name) => name.includes("push_notifications"));
  assert.ok(file, "expected a push_notifications migration");
  const sql = readFileSync(path.join(migrations, file ?? ""), "utf8").toLowerCase();
  for (const table of ["push_subscriptions", "notifications"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon`));
  }
  assert.match(sql, /unique \(endpoint\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /revoke all on function public\.begin_owner_notifications\(text, text, text, text\) from public, anon, authenticated/);
  assert.match(sql, /revoke all on function public\.finish_owner_notification\(uuid, boolean, text, text\[\], text\[\]\) from public, anon, authenticated/);
  assert.match(sql, /auth\.jwt\(\)/);
  assert.match(sql, /grant execute on function public\.begin_owner_notifications\(text, text, text, text\) to service_role/);
});

test("app icons are generated pngs", () => {
  for (const relative of ["public/apple-touch-icon.png", "public/icons/icon-192.png", "public/icons/icon-512.png"]) {
    const bytes = readFileSync(path.join(root, relative));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", relative);
    assert.ok(bytes.length > 500, relative);
  }
});
