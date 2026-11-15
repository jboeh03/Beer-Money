import { signOut } from "@/app/auth/actions";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function AccountMenu() {
  if (!getPublicSupabaseEnv()) {
    return null;
  }

  let email: string | null = null;
  let signedIn = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
    email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  } catch {
    return null;
  }

  if (!signedIn) {
    return null;
  }

  return (
    <form action={signOut} className="flex min-w-0 items-center gap-2">
      {email ? (
        <p className="min-w-0 flex-1 truncate text-xs text-secondary" title={email}>
          {email}
        </p>
      ) : null}
      <button
        type="submit"
        className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Sign out
      </button>
    </form>
  );
}
