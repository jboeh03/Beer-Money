import { createHash, timingSafeEqual } from "node:crypto";

// Hash both sides so a different length cannot skip the comparison.
export function secretMatches(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  const matches = timingSafeEqual(providedHash, expectedHash);
  return expected.length > 0 && matches;
}
