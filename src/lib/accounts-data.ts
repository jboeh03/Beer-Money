import { safeHttpUrl } from "@/lib/today-model";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { AccountRecord } from "@/lib/accounts-model";

export type WalletRecord = {
  id: string;
  label: string | null;
  address: string;
};

export type AccountLoad =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "ready"; email: string | null; accounts: AccountRecord[]; wallets: WalletRecord[] };

export async function loadAccountArea(): Promise<AccountLoad> {
  if (!getPublicSupabaseEnv()) {
    return { status: "unconfigured" };
  }

  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const missingSession =
      claimsError?.name === "AuthSessionMissingError" ||
      /auth session missing/i.test(claimsError?.message ?? "");

    if (!claimsData?.claims) {
      if (claimsError && !missingSession) {
        return { status: "error" };
      }
      return { status: "signed-out" };
    }

    const email = typeof claimsData.claims.email === "string" ? claimsData.claims.email : null;
    const [accounts, wallets] = await Promise.all([
      supabase
        .from("connected_accounts")
        .select("id, app_name, category, username, referral_url, referral_code, cadence, notes")
        .order("category")
        .order("app_name"),
      supabase.from("wallet_addresses").select("id, label, address").order("created_at"),
    ]);

    if (accounts.error) {
      return { status: "error" };
    }

    return {
      status: "ready",
      email,
      accounts: (accounts.data ?? []).map((row) => ({
        id: row.id,
        appName: row.app_name,
        category: row.category,
        username: row.username,
        referralUrl: safeHttpUrl(row.referral_url),
        referralCode: row.referral_code,
        cadence: row.cadence,
        notes: row.notes,
      })),
      wallets: wallets.error
        ? []
        : (wallets.data ?? []).map((row) => ({
            id: row.id,
            label: row.label,
            address: row.address,
          })),
    };
  } catch {
    return { status: "error" };
  }
}
