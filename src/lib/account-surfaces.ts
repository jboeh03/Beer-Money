import type { AccountRecord } from "@/lib/accounts-model";
import type { OpportunityRecord } from "@/lib/opportunities-model";
import type { ReferralRecord } from "@/lib/referrals-model";
import type { OpportunityView } from "@/lib/today-model";

export type OwnerApp = {
  appName: string;
  category: string;
};

const CADENCE_DETAIL = {
  daily: "Daily bonus. You open it yourself.",
  "24h": "24h from last claim. You open it yourself.",
  weekly: "Weekly bonus. You open it yourself.",
  monthly: "Monthly bonus. You open it yourself.",
  none: "",
} as const;

function initialFor(name: string) {
  const match = name.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "?";
}

function appKey(value: string) {
  return value.trim().toLowerCase();
}

export function ownerApps(accounts: readonly AccountRecord[]): OwnerApp[] {
  return accounts.map((account) => ({
    appName: account.appName,
    category: account.category,
  }));
}

export function checklistFromAccounts(accounts: readonly AccountRecord[]): OpportunityView[] {
  return accounts
    .filter((account) => account.cadence !== "none")
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.appName.localeCompare(b.appName),
    )
    .map((account) => ({
      id: account.id,
      name: account.appName,
      detail: [account.category, CADENCE_DETAIL[account.cadence]].filter(Boolean).join(" · "),
      payoutLabel: "—",
      minutesLabel: "—",
      hourlyLabel: "—",
      hourly: null,
      score: null,
      source: null,
      platform: null,
      href: account.referralUrl,
      completed: false,
      initial: initialFor(account.appName),
    }));
}

export function opportunityMatchesApp(
  row: Pick<OpportunityRecord, "app" | "title">,
  apps: readonly OwnerApp[],
) {
  const names = new Set(apps.map((app) => appKey(app.appName)));
  const app = row.app?.trim().toLowerCase() ?? "";
  const title = row.title.trim().toLowerCase();
  return (app.length > 0 && names.has(app)) || (title.length > 0 && names.has(title));
}

export function referralLinksFromAccounts(accounts: readonly AccountRecord[]): ReferralRecord[] {
  return accounts
    .filter((account) => account.referralUrl || account.referralCode)
    .map((account) => ({
      id: `account-${account.id}`,
      label: account.appName,
      category: account.category,
      app: account.appName,
      platform: null,
      url: account.referralUrl,
      ratePercent: null,
      payoutPerSignupCents: null,
      signups: 0,
      priority: 0,
      status: "new" as const,
      notes: account.referralCode ? `Code ${account.referralCode}` : account.username,
      metricsRecorded: false,
      copyValue: account.referralUrl ?? account.referralCode,
    }));
}

export function mergeReferralRows(
  stored: readonly ReferralRecord[],
  fromAccounts: readonly ReferralRecord[],
) {
  const urls = new Set(stored.map((row) => row.url).filter((url): url is string => Boolean(url)));
  const extra = fromAccounts.filter((row) => !row.url || !urls.has(row.url));
  return [...stored, ...extra];
}
