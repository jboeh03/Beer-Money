import type { RewardStatus } from "@/lib/database.types";

export type OpportunityInput = {
  id: string;
  title: string;
  app: string | null;
  source: string | null;
  platform: string | null;
  category: string | null;
  status: RewardStatus;
  payoutCents: number | null;
  estMinutes: number | null;
  dollarsPerHour: number | null;
  vetterScore: number | null;
  externalUrl: string | null;
  notes: string | null;
  priority: number;
};

export type PayoutInput = {
  id: string;
  amountCents: number;
  status: RewardStatus;
  category: string | null;
  paidOn: string | null;
  createdAt: string;
};

export type OpportunityView = {
  id: string;
  name: string;
  detail: string;
  payoutLabel: string;
  minutesLabel: string;
  hourlyLabel: string;
  hourly: number | null;
  score: number | null;
  source: string | null;
  platform: string | null;
  href: string | null;
  completed: boolean;
  initial: string;
};

export type ChartSegment = {
  category: string;
  cents: number;
  colorIndex: number;
};

export type TodayView = {
  readyCount: number;
  vettedCount: number;
  topOpportunities: OpportunityView[];
  checklist: OpportunityView[];
  checklistDone: number;
  stats: {
    todayCents: number;
    todayDeltaCents: number | null;
    weekCents: number;
    weekDeltaCents: number | null;
    monthCents: number;
    paceCents: number | null;
    pendingCents: number;
    pendingCount: number;
  };
  chart: {
    days: {
      iso: string;
      label: string;
      isToday: boolean;
      segments: ChartSegment[];
    }[];
    legend: ChartSegment[];
  };
};

const DAILY_CATEGORY = /daily|bonus|checklist/i;
const SERIES_LIMIT = 4;

export function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function safeHttpUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  const fromMonday = weekday === 0 ? 6 : weekday - 1;
  return addDays(iso, -fromMonday);
}

function daysInMonth(iso: string): number {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function hourlyRate(item: OpportunityInput): number | null {
  if (item.dollarsPerHour != null) {
    return item.dollarsPerHour;
  }
  if (item.payoutCents == null || !item.estMinutes) {
    return null;
  }
  return Math.round((item.payoutCents / 100) * (60 / item.estMinutes) * 100) / 100;
}

function initialFor(name: string): string {
  const match = name.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "?";
}

function viewOpportunity(item: OpportunityInput): OpportunityView {
  const name = item.app?.trim() || item.title.trim();
  const detail =
    item.app && item.title.trim() && item.title.trim() !== name
      ? item.title.trim()
      : item.notes?.trim() || item.category?.trim() || "Open it yourself";
  const hourly = hourlyRate(item);

  return {
    id: item.id,
    name,
    detail,
    payoutLabel: item.payoutCents == null ? "—" : formatUsd(item.payoutCents),
    minutesLabel: item.estMinutes ? `${item.estMinutes} min` : "—",
    hourlyLabel: hourly == null ? "—" : `${formatUsd(Math.round(hourly * 100))}/hr`,
    hourly,
    score: item.vetterScore,
    source: item.source,
    platform: item.platform,
    href: safeHttpUrl(item.externalUrl),
    completed: item.status === "claimed" || item.status === "paid",
    initial: initialFor(name),
  };
}

function isDaily(item: OpportunityInput): boolean {
  return DAILY_CATEGORY.test(item.category ?? "");
}

function paidDay(payout: PayoutInput): string | null {
  if (payout.status !== "paid") {
    return null;
  }
  if (payout.paidOn) {
    return payout.paidOn.slice(0, 10);
  }
  return payout.createdAt.slice(0, 10);
}

function sumBetween(payouts: readonly PayoutInput[], start: string, end: string): number {
  return payouts.reduce((total, payout) => {
    const day = paidDay(payout);
    if (!day || day < start || day > end) {
      return total;
    }
    return total + payout.amountCents;
  }, 0);
}

export function buildTodayView(
  opportunities: readonly OpportunityInput[],
  payouts: readonly PayoutInput[],
  now: Date,
): TodayView {
  const today = utcDay(now);
  const yesterday = addDays(today, -1);
  const weekStart = startOfWeek(today);
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = addDays(weekStart, -1);
  const monthStart = `${today.slice(0, 8)}01`;
  const ready = opportunities.filter((item) => item.status !== "rejected");
  const daily = ready.filter(isDaily);
  const dailyIds = new Set(daily.map((item) => item.id));
  const topOpportunities = ready
    .filter((item) => !dailyIds.has(item.id))
    .sort((a, b) => (hourlyRate(b) ?? -1) - (hourlyRate(a) ?? -1))
    .slice(0, 4)
    .map(viewOpportunity);
  const checklist = [...daily]
    .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
    .map(viewOpportunity);
  const checklistDone = checklist.filter((item) => item.completed).length;

  const todayCents = sumBetween(payouts, today, today);
  const yesterdayCents = sumBetween(payouts, yesterday, yesterday);
  const weekCents = sumBetween(payouts, weekStart, today);
  const previousWeekCents = sumBetween(payouts, previousWeekStart, previousWeekEnd);
  const monthCents = sumBetween(payouts, monthStart, today);
  const dayOfMonth = Number(today.slice(8, 10));
  const paceCents =
    monthCents > 0 && dayOfMonth > 0
      ? Math.round((monthCents / dayOfMonth) * daysInMonth(today))
      : null;
  const pending = payouts.filter(
    (payout) => payout.status !== "paid" && payout.status !== "rejected",
  );

  const windowStart = addDays(today, -6);
  const totals = new Map<string, number>();
  const byDay = new Map<string, Map<string, number>>();

  for (const payout of payouts) {
    const day = paidDay(payout);
    if (!day || day < windowStart || day > today) {
      continue;
    }
    const category = payout.category?.trim() || "Uncategorized";
    totals.set(category, (totals.get(category) ?? 0) + payout.amountCents);
    const dayTotals = byDay.get(day) ?? new Map<string, number>();
    dayTotals.set(category, (dayTotals.get(category) ?? 0) + payout.amountCents);
    byDay.set(day, dayTotals);
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const named = ranked.slice(0, SERIES_LIMIT);
  const overflow = ranked.slice(SERIES_LIMIT);
  const legendCategories = named.map(([category], index) => ({ category, index }));
  if (overflow.length > 0) {
    legendCategories.push({ category: "Other", index: legendCategories.length });
  }
  const colorOf = new Map(legendCategories.map((item) => [item.category, item.index]));

  function segmentsFor(day: string): ChartSegment[] {
    const dayTotals = byDay.get(day);
    if (!dayTotals) {
      return [];
    }
    const buckets = new Map<string, number>();
    for (const [category, cents] of dayTotals) {
      const label = colorOf.has(category) ? category : "Other";
      buckets.set(label, (buckets.get(label) ?? 0) + cents);
    }
    return [...buckets.entries()]
      .map(([category, cents]) => ({
        category,
        cents,
        colorIndex: colorOf.get(category) ?? 0,
      }))
      .sort((a, b) => a.colorIndex - b.colorIndex);
  }

  const days = Array.from({ length: 7 }, (_, index) => {
    const iso = addDays(windowStart, index);
    return {
      iso,
      label: weekdayLabel(iso),
      isToday: iso === today,
      segments: segmentsFor(iso),
    };
  });

  const legend = legendCategories.map((item) => ({
    category: item.category,
    cents:
      item.category === "Other"
        ? overflow.reduce((total, [, cents]) => total + cents, 0)
        : (totals.get(item.category) ?? 0),
    colorIndex: item.index,
  }));

  return {
    readyCount: ready.length,
    vettedCount: ready.filter((item) => item.status === "vetted").length,
    topOpportunities,
    checklist,
    checklistDone,
    stats: {
      todayCents,
      todayDeltaCents: todayCents === 0 && yesterdayCents === 0 ? null : todayCents - yesterdayCents,
      weekCents,
      weekDeltaCents:
        weekCents === 0 && previousWeekCents === 0 ? null : weekCents - previousWeekCents,
      monthCents,
      paceCents,
      pendingCents: pending.reduce((total, payout) => total + payout.amountCents, 0),
      pendingCount: pending.length,
    },
    chart: { days, legend },
  };
}

export function deltaCopy(cents: number, comparison: string) {
  if (cents === 0) {
    return { direction: "flat" as const, label: `Same ${comparison}` };
  }
  const direction = cents > 0 ? ("up" as const) : ("down" as const);
  const sign = cents > 0 ? "+" : "−";
  return { direction, label: `${sign}${formatUsd(Math.abs(cents))} ${comparison}` };
}

export function isTodayEmpty(
  opportunities: readonly OpportunityInput[],
  payouts: readonly PayoutInput[],
) {
  return opportunities.length === 0 && payouts.length === 0;
}
