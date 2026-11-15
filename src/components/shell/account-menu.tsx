import { AccountMenuButton } from "@/components/shell/account-menu-button";
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

  return <AccountMenuButton email={email} />;
}
