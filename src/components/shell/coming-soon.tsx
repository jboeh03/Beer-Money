import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { SetupNotice } from "@/components/setup-notice";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function ComingSoon({ title, href }: { title: string; href: string }) {
  if (!getPublicSupabaseEnv()) {
    return (
      <AppShell activeHref={href}>
        <SetupNotice />
      </AppShell>
    );
  }

  let signedIn = false;
  let sessionError = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const missingSession =
      error?.name === "AuthSessionMissingError" ||
      /auth session missing/i.test(error?.message ?? "");
    signedIn = Boolean(data?.claims);
    sessionError = !signedIn && Boolean(error) && !missingSession;
  } catch {
    signedIn = false;
  }

  if (sessionError) {
    return (
      <AppShell activeHref={href}>
        <p className="text-sm text-secondary">Could not check the session. Try again.</p>
      </AppShell>
    );
  }

  if (!signedIn) {
    redirect("/");
  }

  return (
    <AppShell activeHref={href}>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 max-w-xl text-sm text-secondary">
        Coming soon, this screen is next on the build list.
      </p>
    </AppShell>
  );
}
