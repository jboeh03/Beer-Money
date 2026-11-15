import type { RewardStatus } from "@/lib/database.types";
import { referralUrl, type ReferralRecord } from "@/lib/referrals-model";
import { toNumber } from "@/lib/today-model";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export type ReferralsLoad =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; rows: ReferralRecord[] };

export async function loadReferrals(): Promise<ReferralsLoad> {
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

    const { data, error } = await supabase
      .from("referral_links")
      .select(
        "id, label, category, app, platform, url, referral_rate_percent, payout_per_signup_cents, signups, priority, status, notes",
      );

    if (error) {
      return { status: "error" };
    }

    const rows: ReferralRecord[] = (data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      category: row.category,
      app: row.app,
      platform: row.platform,
      url: referralUrl(row.url),
      ratePercent: toNumber(row.referral_rate_percent),
      payoutPerSignupCents: toNumber(row.payout_per_signup_cents),
      signups: row.signups,
      priority: row.priority,
      status: row.status as RewardStatus,
      notes: row.notes,
    }));

    if (rows.length === 0) {
      return { status: "empty" };
    }

    return { status: "ready", rows };
  } catch {
    return { status: "error" };
  }
}
