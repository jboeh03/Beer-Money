// VAPID public keys are the uncompressed P-256 point, 65 bytes, URL-safe base64.
export function urlBase64ToBytes(value: string): Uint8Array<ArrayBuffer> | null {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  const padded = trimmed + "=".repeat((4 - (trimmed.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (bytes.length !== 65) return null;
  return bytes;
}
