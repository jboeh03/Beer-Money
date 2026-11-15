import type { RewardStatus } from "@/lib/database.types";
import type { OfferRecord } from "@/lib/offers-model";
import { offerUrl } from "@/lib/offers-model";
import { toNumber } from "@/lib/today-model";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export type OffersLoad =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; rows: OfferRecord[] };

export async function loadOffers(): Promise<OffersLoad> {
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
      .from("offers")
      .select(
        "id, title, app, platform, payout_cents, est_minutes, dollars_per_hour, notes, terms_url, status",
      );

    if (error) {
      return { status: "error" };
    }

    const rows: OfferRecord[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      app: row.app,
      platform: row.platform,
      payoutCents: toNumber(row.payout_cents),
      minutes: row.est_minutes,
      hourly: toNumber(row.dollars_per_hour),
      notes: row.notes,
      url: offerUrl(row.terms_url),
      status: row.status as RewardStatus,
    }));

    if (rows.length === 0) {
      return { status: "empty" };
    }

    return { status: "ready", rows };
  } catch {
    return { status: "error" };
  }
}
