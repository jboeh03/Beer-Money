import type { RewardStatus } from "@/lib/database.types";
import type { OpportunityRecord } from "@/lib/opportunities-model";
import { toNumber, safeHttpUrl } from "@/lib/today-model";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export type OpportunitiesLoad =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; rows: OpportunityRecord[] };

export async function loadOpportunities(): Promise<OpportunitiesLoad> {
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
      .from("opportunities")
      .select(
        "id, title, app, platform, source, category, status, payout_cents, est_minutes, dollars_per_hour, vetter_score, notes, external_url",
      );

    if (error) {
      return { status: "error" };
    }

    const rows: OpportunityRecord[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      app: row.app,
      platform: row.platform,
      source: row.source,
      category: row.category,
      status: row.status as RewardStatus,
      payoutCents: toNumber(row.payout_cents),
      minutes: row.est_minutes,
      hourly: toNumber(row.dollars_per_hour),
      score: row.vetter_score,
      notes: row.notes,
      url: safeHttpUrl(row.external_url),
    }));

    if (rows.length === 0) {
      return { status: "empty" };
    }

    return { status: "ready", rows };
  } catch {
    return { status: "error" };
  }
}
