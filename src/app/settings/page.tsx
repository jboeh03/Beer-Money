import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { SetupNotice } from "@/components/setup-notice";
import { loadAccountArea } from "@/lib/accounts-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings · Beer Money" };

async function SettingsContent() {
  const loaded = await loadAccountArea();
  if (loaded.status === "signed-out") {
    redirect("/");
  }
  if (loaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/settings">
        <SetupNotice />
      </AppShell>
    );
  }
  if (loaded.status === "error") {
    return (
      <AppShell activeHref="/settings">
        <p className="text-sm text-secondary">Settings could not load.</p>
      </AppShell>
    );
  }

  const email = loaded.email;

  return (
    <AppShell activeHref="/settings">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <Card>
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <p className="mt-2 text-sm text-secondary">{email ?? "Signed in"}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <p className="mt-2 text-sm text-secondary">
            Push notification settings are not in this branch yet.
          </p>
          <Link
            href="/settings/notifications"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open notifications
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
