import type { RewardStatus } from "@/lib/database.types";

export type OpportunityRecord = {
  id: string;
  title: string;
  app: string | null;
  platform: string | null;
  source: string | null;
  category: string | null;
  status: RewardStatus;
  payoutCents: number | null;
  minutes: number | null;
  hourly: number | null;
  score: number | null;
  notes: string | null;
  url: string | null;
};

export type StatusFilter = "not-rejected" | "all" | RewardStatus;

export type SortKey =
  | "name"
  | "category"
  | "source"
  | "payout"
  | "minutes"
  | "hourly"
  | "score"
  | "status";

export const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "not-rejected", label: "Not rejected" },
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "vetted", label: "Vetted" },
  { id: "queued", label: "Queued" },
  { id: "claimed", label: "Claimed" },
  { id: "paid", label: "Paid" },
  { id: "rejected", label: "Rejected" },
];

export function opportunityName(row: OpportunityRecord) {
  return row.app?.trim() || row.title.trim();
}

export function matchesStatus(row: OpportunityRecord, status: StatusFilter) {
  if (status === "all") {
    return true;
  }
  if (status === "not-rejected") {
    return row.status !== "rejected";
  }
  return row.status === status;
}

export function filterOpportunities(
  rows: readonly OpportunityRecord[],
  filters: {
    query: string;
    status: StatusFilter;
    category: string;
    source: string;
    minHourly: number | null;
  },
) {
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (!matchesStatus(row, filters.status)) {
      return false;
    }
    if (filters.category !== "all" && (row.category ?? "") !== filters.category) {
      return false;
    }
    if (filters.source !== "all" && (row.source ?? "") !== filters.source) {
      return false;
    }
    if (filters.minHourly != null && (row.hourly == null || row.hourly < filters.minHourly)) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [opportunityName(row), row.title, row.platform, row.source, row.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function sortValue(row: OpportunityRecord, key: SortKey): string | number | null {
  switch (key) {
    case "name":
      return opportunityName(row);
    case "category":
      return row.category;
    case "source":
      return row.source;
    case "payout":
      return row.payoutCents;
    case "minutes":
      return row.minutes;
    case "hourly":
      return row.hourly;
    case "score":
      return row.score;
    case "status":
      return row.status;
    default:
      return null;
  }
}

export function sortOpportunities(
  rows: readonly OpportunityRecord[],
  key: SortKey,
  direction: "asc" | "desc",
) {
  return [...rows].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left == null && right == null) {
      return 0;
    }
    if (left == null) {
      return 1;
    }
    if (right == null) {
      return -1;
    }
    const result =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return direction === "asc" ? result : -result;
  });
}

export function statusCounts(rows: readonly OpportunityRecord[]) {
  const counts = {
    all: rows.length,
    "not-rejected": rows.filter((row) => row.status !== "rejected").length,
    new: 0,
    vetted: 0,
    queued: 0,
    claimed: 0,
    paid: 0,
    rejected: 0,
  };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return counts;
}
