"use server";

import { redirect } from "next/navigation";
import type { RewardStatus } from "@/lib/database.types";
import { safeHttpUrl, toNumber } from "@/lib/today-model";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function createOpportunity(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/");
  }

  const title = text(formData, "title");
  if (!title) {
    redirect("/opportunities?error=title");
  }

  const payoutDollars = toNumber(text(formData, "payout"));
  const minutes = toNumber(text(formData, "minutes"));
  const score = toNumber(text(formData, "score"));
  const status = text(formData, "status") ?? "new";
  const allowed = ["new", "vetted", "queued", "claimed", "paid", "rejected"];

  if (!allowed.includes(status)) {
    redirect("/opportunities?error=save");
  }
  if (payoutDollars != null && payoutDollars < 0) {
    redirect("/opportunities?error=save");
  }
  if (minutes != null && minutes <= 0) {
    redirect("/opportunities?error=save");
  }
  if (score != null && (score < 0 || score > 100)) {
    redirect("/opportunities?error=save");
  }

  const { error } = await supabase.from("opportunities").insert({
    title,
    app: text(formData, "app"),
    platform: text(formData, "platform"),
    source: text(formData, "source"),
    category: text(formData, "category"),
    payout_cents: payoutDollars == null ? null : Math.round(payoutDollars * 100),
    est_minutes: minutes == null ? null : Math.round(minutes),
    vetter_score: score == null ? null : Math.round(score),
    external_url: safeHttpUrl(text(formData, "url")),
    notes: text(formData, "notes"),
    status: status as RewardStatus,
  });

  if (error) {
    redirect("/opportunities?error=save");
  }

  redirect("/opportunities");
}
