export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const ENDPOINT_MAX = 2000;

export function parseClientSubscription(
  input: unknown,
): { ok: true; subscription: StoredSubscription } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Subscription is invalid." };
  }
  const record = input as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  const endpoint = parsePushEndpoint(record.endpoint);
  if (!endpoint) {
    return { ok: false, error: "Subscription endpoint is invalid." };
  }
  const p256dh = record.keys?.p256dh;
  const auth = record.keys?.auth;
  if (!isKey(p256dh) || !isKey(auth)) {
    return { ok: false, error: "Subscription keys are invalid." };
  }
  return { ok: true, subscription: { endpoint, p256dh, auth } };
}

export function parsePushEndpoint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const endpoint = value.trim();
  if (endpoint.length === 0 || endpoint.length > ENDPOINT_MAX) return null;
  try {
    const url = new URL(endpoint);
    if (url.username || url.password) return null;
    if (url.protocol === "https:") return endpoint;
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "http:" && local) return endpoint;
  } catch {
    return null;
  }
  return null;
}

function isKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 16 && value.length <= 200 && /^[A-Za-z0-9_-]+$/.test(value);
}
