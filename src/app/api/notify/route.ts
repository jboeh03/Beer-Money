import { notifyGate } from "@/lib/push/gate";
import { parseNotifyRequest } from "@/lib/push/message";
import { broadcastNotification } from "@/lib/push/broadcast";
import { readVapidConfig } from "@/lib/push/vapid";

export const runtime = "nodejs";

const SECRET_HEADER = "x-notify-secret";

export async function POST(request: Request) {
  const vapid = readVapidConfig(process.env);
  const gate = notifyGate({
    configuredSecret: process.env.NOTIFY_SECRET,
    header: request.headers.get(SECRET_HEADER),
    vapidReady: vapid.ok,
  });

  if (gate.status === 503 || !vapid.ok) {
    return Response.json({ error: "Notifications are not configured." }, { status: 503 });
  }
  if (gate.status === 401) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON object." }, { status: 400 });
  }

  const parsed = parseNotifyRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Notifications are not configured." }, { status: 503 });
  }

  try {
    const result = await broadcastNotification(parsed.message, vapid.config);
    return Response.json(result);
  } catch (error) {
    console.error("notify failed", error instanceof Error ? error.name : "error");
    return Response.json({ error: "The notification could not be sent." }, { status: 500 });
  }
}
