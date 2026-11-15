export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

// Reads server env names only. The private key must never use a NEXT_PUBLIC_ name.
export function readVapidConfig(
  env: Record<string, string | undefined>,
): { ok: true; config: VapidConfig } | { ok: false; error: string } {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = env.VAPID_SUBJECT?.trim() ?? "";
  if (!publicKey || !privateKey || !subject) {
    return { ok: false, error: "Missing VAPID configuration." };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(publicKey) || !/^[A-Za-z0-9_-]+$/.test(privateKey)) {
    return { ok: false, error: "VAPID keys must be URL-safe base64." };
  }
  try {
    const url = new URL(subject);
    if (url.protocol !== "https:" && url.protocol !== "mailto:") {
      return { ok: false, error: "VAPID subject must be an https or mailto URL." };
    }
  } catch {
    return { ok: false, error: "VAPID subject must be an https or mailto URL." };
  }
  return { ok: true, config: { publicKey, privateKey, subject } };
}
