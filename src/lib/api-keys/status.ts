export function keyStatusLabel(
  saved: { lastTestedAt: string | null; lastTestOk: boolean | null } | null,
  testable: boolean,
): string {
  if (!saved) {
    return "No key saved";
  }
  if (!testable) {
    return "Saved (not tested)";
  }
  if (saved.lastTestedAt === null) {
    return "Not tested";
  }
  return saved.lastTestOk ? "Passed" : "Failed";
}

export function formatKeyTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}
