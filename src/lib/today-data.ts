import type { RewardStatus } from "@/lib/database.types";
import {
  buildTodayView,
  isTodayEmpty,
  toNumber,
  type OpportunityInput,
  type PayoutInput,
  type TodayView,
} from "@/lib/today-model";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export type TodayLoad =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "empty"; name: string }
  | { status: "ready"; name: string; view: TodayView };

function displayName(email: string | null): string {
  const local = email?.split("@")[0]?.split(/[._+-]/)[0] ?? "";
  if (!local) {
    return "there";
  }
  return local.charAt(0).toUpperCase() + local.slice(1, 40);
}

function mapOpportunity(row: {
  id: string;
  title: string;
  app: string | null;
  source: string | null;
  platform: string | null;
  category: string | null;
  status: RewardStatus;
  payout_cents: number | string | null;
  est_minutes: number | null;
  dollars_per_hour: number | string | null;
  vetter_score: number | null;
  external_url: string | null;
  notes: string | null;
  priority: number;
}): OpportunityInput {
  return {
    id: row.id,
    title: row.title,
    app: row.app,
    source: row.source,
    platform: row.platform,
    category: row.category,
    status: row.status,
    payoutCents: toNumber(row.payout_cents),
    estMinutes: row.est_minutes,
    dollarsPerHour: toNumber(row.dollars_per_hour),
    vetterScore: row.vetter_score,
    externalUrl: row.external_url,
    notes: row.notes,
    priority: row.priority,
  };
}

function mapPayout(row: {
  id: string;
  amount_cents: number | string;
  status: RewardStatus;
  category: string | null;
  paid_on: string | null;
  created_at: string;
}): PayoutInput {
  return {
    id: row.id,
    amountCents: toNumber(row.amount_cents) ?? 0,
    status: row.status,
    category: row.category,
    paidOn: row.paid_on,
    createdAt: row.created_at,
  };
}

export async function loadToday(now = new Date()): Promise<TodayLoad> {
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
    const name = displayName(email);
    const [opportunities, payouts] = await Promise.all([
      supabase
        .from("opportunities")
        .select(
          "id, title, app, source, platform, category, status, payout_cents, est_minutes, dollars_per_hour, vetter_score, external_url, notes, priority",
        ),
      supabase
        .from("payouts")
        .select("id, amount_cents, status, category, paid_on, created_at"),
    ]);

    if (opportunities.error || payouts.error) {
      return { status: "error" };
    }

    const opportunityRows = (opportunities.data ?? []).map(mapOpportunity);
    const payoutRows = (payouts.data ?? []).map(mapPayout);

    if (isTodayEmpty(opportunityRows, payoutRows)) {
      return { status: "empty", name };
    }

    return {
      status: "ready",
      name,
      view: buildTodayView(opportunityRows, payoutRows, now),
    };
  } catch {
    return { status: "error" };
  }
}
