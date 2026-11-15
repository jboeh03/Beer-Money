import type { RewardStatus } from "@/lib/database.types";
import { safeHttpUrl } from "@/lib/today-model";

export type ReferralRecord = {
  id: string;
  label: string;
  category: string | null;
  app: string | null;
  platform: string | null;
  url: string | null;
  ratePercent: number | null;
  payoutPerSignupCents: number | null;
  signups: number;
  priority: number;
  status: RewardStatus;
  notes: string | null;
};

export type ReferralMode = "category" | "priority";

export function activeReferrals(rows: readonly ReferralRecord[]) {
  return rows.filter((row) => row.status !== "rejected");
}

export function referralGroups(rows: readonly ReferralRecord[], mode: ReferralMode) {
  const visible = activeReferrals(rows);
  if (mode === "priority") {
    return [
      {
        category: "All links",
        rows: [...visible].sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label)),
      },
    ];
  }

  const categories = [...new Set(visible.map((row) => row.category?.trim() || "Uncategorized"))].sort();
  return categories.map((category) => ({
    category,
    rows: visible
      .filter((row) => (row.category?.trim() || "Uncategorized") === category)
      .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label)),
  }));
}

export function referralStats(rows: readonly ReferralRecord[]) {
  const active = activeReferrals(rows);
  const signups = active.reduce((total, row) => total + row.signups, 0);
  const estimatedCents = active.reduce((total, row) => {
    if (row.payoutPerSignupCents == null) {
      return total;
    }
    return total + row.signups * row.payoutPerSignupCents;
  }, 0);
  const pending = active.filter((row) => row.status === "queued" || row.status === "claimed");
  return {
    activeCount: active.length,
    categories: new Set(active.map((row) => row.category?.trim() || "Uncategorized")).size,
    signups,
    estimatedCents,
    pendingCount: pending.length,
    priorities: [...active].sort((a, b) => b.priority - a.priority).slice(0, 5),
  };
}

export function referralUrl(value: string | null) {
  return safeHttpUrl(value);
}
