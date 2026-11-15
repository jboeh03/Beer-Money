import "server-only";

import {
  deliverToSubscriptions,
  deliveryErrorText,
  MAX_PUSH_DEVICES,
  type PushTarget,
} from "@/lib/push/deliver";
import type { PushMessage } from "@/lib/push/message";
import { sendWebPush } from "@/lib/push/send";
import type { VapidConfig } from "@/lib/push/vapid";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type BroadcastResult = {
  ok: true;
  sent: number;
  pruned: number;
  failed: number;
};

type BroadcastRow = {
  notification_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

// POST /api/notify has no user session, so auth.uid() is null and RLS would
// hide every subscription. The service role is used only to call the private
// security-definer functions. The signed-in test button does not use this module.
export async function broadcastNotification(
  message: PushMessage,
  vapid: VapidConfig,
): Promise<BroadcastResult> {
  const supabase = createServiceRoleClient();
  const begun = await supabase.rpc("begin_owner_notifications", {
    p_title: message.title,
    p_body: message.body,
    p_url: message.url,
    p_source: message.source,
  });
  if (begun.error) {
    console.error("begin_owner_notifications failed", begun.error.code);
    throw new Error("Could not record the notification.");
  }

  const rows = (begun.data ?? []) as BroadcastRow[];
  const groups = new Map<string, PushTarget[]>();
  for (const row of rows) {
    const list = groups.get(row.notification_id) ?? [];
    if (list.length >= MAX_PUSH_DEVICES) continue;
    list.push({
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth_secret,
    });
    groups.set(row.notification_id, list);
  }

  let sent = 0;
  let pruned = 0;
  let failed = 0;
  for (const [notificationId, targets] of groups) {
    const report = await deliverToSubscriptions(targets, message, (target, payload) =>
      sendWebPush(target, payload, vapid),
    );
    sent += report.sent.length;
    pruned += report.pruned.length;
    failed += report.failed.length;
    const finished = await supabase.rpc("finish_owner_notification", {
      p_notification_id: notificationId,
      p_sent: report.sent.length > 0,
      p_error: deliveryErrorText(report),
      p_prune_endpoints: report.pruned,
      p_used_endpoints: report.sent,
    });
    if (finished.error) {
      console.error("finish_owner_notification failed", finished.error.code);
      throw new Error("Could not record the push result.");
    }
  }

  return { ok: true, sent, pruned, failed };
}
