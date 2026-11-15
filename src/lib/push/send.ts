import "server-only";

import { sendNotification } from "web-push";
import type { PushTarget } from "@/lib/push/deliver";
import type { VapidConfig } from "@/lib/push/vapid";

export async function sendWebPush(target: PushTarget, payload: string, vapid: VapidConfig): Promise<void> {
  await sendNotification(
    {
      endpoint: target.endpoint,
      keys: {
        p256dh: target.p256dh,
        auth: target.auth,
      },
    },
    payload,
    {
      TTL: 60 * 60,
      vapidDetails: {
        subject: vapid.subject,
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
      },
    },
  );
}
