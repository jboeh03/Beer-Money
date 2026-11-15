"use server";

import { headers } from "next/headers";
import {
  deliverToSubscriptions,
  deliveryErrorText,
  MAX_PUSH_DEVICES,
} from "@/lib/push/deliver";
import { sendWebPush } from "@/lib/push/send";
import { parseClientSubscription, parsePushEndpoint } from "@/lib/push/subscription";
import { readVapidConfig } from "@/lib/push/vapid";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const TEST_TITLE = "Beer Money test";
const TEST_BODY = "Notifications are on. You still claim rewards yourself.";

type AuthedSession = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

async function requireUser(): Promise<AuthedSession | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (error || typeof userId !== "string" || userId.length === 0) {
      return { ok: false, error: "Sign in first." };
    }
    return { ok: true, supabase, userId };
  } catch {
    return { ok: false, error: "Supabase is not configured." };
  }
}

export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const parsed = parseClientSubscription(input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session.ok) return session;

  const headerList = await headers();
  const userAgent = headerList.get("user-agent")?.slice(0, 512) ?? null;
  const { error } = await session.supabase.from("push_subscriptions").upsert(
    {
      user_id: session.userId,
      endpoint: parsed.subscription.endpoint,
      p256dh: parsed.subscription.p256dh,
      auth: parsed.subscription.auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("push subscription save failed", error.code);
    return { ok: false, error: "Could not save this device." };
  }
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const parsed = parsePushEndpoint(endpoint);
  if (!parsed) return { ok: false, error: "That subscription endpoint is invalid." };
  const session = await requireUser();
  if (!session.ok) return session;

  const { error } = await session.supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", session.userId)
    .eq("endpoint", parsed);
  if (error) {
    console.error("push subscription delete failed", error.code);
    return { ok: false, error: "Could not disable this device." };
  }
  return { ok: true };
}

export async function sendTestNotification(): Promise<ActionResult> {
  const session = await requireUser();
  if (!session.ok) return session;
  const vapid = readVapidConfig(process.env);
  if (!vapid.ok) return { ok: false, error: "Push is not configured on the server." };

  const { data, error } = await session.supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: true })
    .limit(MAX_PUSH_DEVICES);
  if (error) {
    console.error("push subscription read failed", error.code);
    return { ok: false, error: "Could not read subscriptions." };
  }
  const targets = data ?? [];
  if (targets.length === 0) {
    return { ok: false, error: "Enable notifications on this device first." };
  }

  const message = {
    title: TEST_TITLE,
    body: TEST_BODY,
    url: "/today",
    source: "test",
  };
  const inserted = await session.supabase
    .from("notifications")
    .insert({
      user_id: session.userId,
      title: message.title,
      body: message.body,
      url: message.url,
      source: message.source,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) {
    console.error("notification log failed", inserted.error?.code);
    return { ok: false, error: "Could not record the test notification." };
  }

  const report = await deliverToSubscriptions(targets, message, (target, payload) =>
    sendWebPush(target, payload, vapid.config),
  );
  const errorText = deliveryErrorText(report);
  const updated = await session.supabase
    .from("notifications")
    .update({
      sent_at: report.sent.length > 0 ? new Date().toISOString() : null,
      error: errorText,
    })
    .eq("id", inserted.data.id)
    .eq("user_id", session.userId);
  if (updated.error) {
    console.error("notification log update failed", updated.error.code);
  }

  if (report.pruned.length > 0) {
    const pruned = await session.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.userId)
      .in("endpoint", report.pruned);
    if (pruned.error) console.error("push prune failed", pruned.error.code);
  }
  if (report.sent.length > 0) {
    const used = await session.supabase
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", session.userId)
      .in("endpoint", report.sent);
    if (used.error) console.error("push last_used update failed", used.error.code);
  }

  if (report.sent.length === 0) {
    return { ok: false, error: errorText ?? "The test notification was not delivered." };
  }
  return { ok: true };
}
