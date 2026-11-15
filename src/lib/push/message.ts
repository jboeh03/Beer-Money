export type PushMessage = {
  title: string;
  body: string | null;
  url: string | null;
  source: string | null;
};

const TITLE_MAX = 120;
const BODY_MAX = 280;
const SOURCE_MAX = 80;
const URL_MAX = 2000;

export function parseNotifyRequest(
  input: unknown,
): { ok: true; message: PushMessage } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Expected a JSON object." };
  }

  const record = input as Record<string, unknown>;
  const title = optionalText(record.title, TITLE_MAX, "Title");
  if (!title.ok) return title;
  if (!title.value) {
    return { ok: false, error: "Title is required." };
  }

  const body = optionalText(record.body, BODY_MAX, "Body");
  if (!body.ok) return body;
  const source = optionalText(record.source, SOURCE_MAX, "Source");
  if (!source.ok) return source;
  const url = normalizeNotificationUrl(record.url);
  if (url === "invalid") {
    return { ok: false, error: "URL must be an in-app path or https URL." };
  }

  return {
    ok: true,
    message: {
      title: title.value,
      body: body.value,
      url,
      source: source.value,
    },
  };
}

export function normalizeNotificationUrl(value: unknown): string | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > URL_MAX || /\s/.test(trimmed) || trimmed.includes("\\")) {
    return "invalid";
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && /^\/[A-Za-z0-9]/.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "invalid";
  }
  if (url.username || url.password) return "invalid";
  if (url.protocol === "https:") return url.toString();
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "http:" && local) return url.toString();
  return "invalid";
}

function optionalText(
  value: unknown,
  max: number,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be text.` };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > max) {
    return { ok: false, error: `${label} must be at most ${max} characters.` };
  }
  return { ok: true, value: trimmed };
}
