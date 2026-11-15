export type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string | null;
  url: string | null;
};

export type DeliveryReport = {
  sent: string[];
  pruned: string[];
  failed: { endpoint: string; status: number | null }[];
};

export type SendPush = (target: PushTarget, payload: string) => Promise<void>;

export const MAX_PUSH_DEVICES = 30;

export function pushPayload(message: PushPayload): string {
  return JSON.stringify({
    title: message.title,
    body: message.body ?? "",
    url: message.url,
  });
}

export function statusFrom(error: unknown): number | null {
  if (typeof error === "object" && error && "statusCode" in error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    return typeof status === "number" ? status : null;
  }
  return null;
}

export async function deliverToSubscriptions(
  targets: PushTarget[],
  message: PushPayload,
  send: SendPush,
): Promise<DeliveryReport> {
  const payload = pushPayload(message);
  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        await send(target, payload);
        return { kind: "sent" as const, endpoint: target.endpoint };
      } catch (error) {
        const status = statusFrom(error);
        if (status === 404 || status === 410) {
          return { kind: "pruned" as const, endpoint: target.endpoint };
        }
        return { kind: "failed" as const, endpoint: target.endpoint, status };
      }
    }),
  );

  const report: DeliveryReport = { sent: [], pruned: [], failed: [] };
  for (const result of results) {
    if (result.kind === "sent") report.sent.push(result.endpoint);
    else if (result.kind === "pruned") report.pruned.push(result.endpoint);
    else report.failed.push({ endpoint: result.endpoint, status: result.status });
  }
  return report;
}

export function deliveryErrorText(report: DeliveryReport): string | null {
  if (report.failed.length === 0 && report.pruned.length === 0) return null;
  const parts: string[] = [];
  if (report.failed.length > 0) {
    parts.push(`Failed for ${report.failed.length} subscription(s)`);
  }
  if (report.pruned.length > 0) {
    parts.push(`Removed ${report.pruned.length} expired subscription(s)`);
  }
  return parts.join(". ");
}
