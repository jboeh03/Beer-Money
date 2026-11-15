import { redirect } from "next/navigation";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { AppShell } from "@/components/shell/app-shell";
import { SetupNotice } from "@/components/setup-notice";
import { ErrorState } from "@/components/ui/states";
import { urlBase64ToBytes } from "@/lib/push/bytes";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications · Beer Money",
};

function publicVapidKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!key || !urlBase64ToBytes(key)) return null;
  return key;
}

export default async function NotificationsPage() {
  const configured = getPublicSupabaseEnv() !== null;
  const publicKey = publicVapidKey();

  if (!configured) {
    return (
      <AppShell activeHref="/settings/notifications">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <NotificationsIntro />
          <NotificationSettings publicKey={publicKey} signedIn={false} deviceCount={0} />
          <SetupNotice />
        </div>
      </AppShell>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string" || userId.length === 0) {
    redirect("/");
  }

  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return (
    <AppShell activeHref="/settings/notifications">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <NotificationsIntro />
        {error ? (
          <ErrorState
            title="Notifications are not ready"
            description="The push tables are not available yet. Apply the latest migration, then reload. Nothing was sent."
          />
        ) : (
          <NotificationSettings publicKey={publicKey} signedIn deviceCount={count ?? 0} />
        )}
      </div>
    </AppShell>
  );
}

function NotificationsIntro() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Notifications</h1>
      <p className="text-sm leading-6 text-secondary">
        Beer Money can tell you when something is ready, for example “Shuffle.us daily bonus ready”.
        Tapping the notice opens that page in the app. You claim the reward yourself. Notifications
        never sign in or submit a form.
      </p>
      <p className="text-sm leading-6 text-secondary">
        On iPhone this only works from the home-screen app, on iOS 16.4 or later. In Safari, tap
        Share, then Add to Home Screen, then open Beer Money from the new icon.
      </p>
    </div>
  );
}
