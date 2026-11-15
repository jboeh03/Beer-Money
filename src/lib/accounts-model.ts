import type { AccountCadence } from "@/lib/database.types";
import type { OpportunityRecord } from "@/lib/opportunities-model";

export type AccountRecord = {
  id: string;
  appName: string;
  category: string;
  username: string | null;
  referralUrl: string | null;
  referralCode: string | null;
  cadence: AccountCadence;
  notes: string | null;
};

export function accountsByCategory(accounts: readonly AccountRecord[]) {
  const names = [...new Set(accounts.map((account) => account.category))].sort();
  return names.map((category) => ({
    category,
    accounts: accounts.filter((account) => account.category === category),
  }));
}

export function unaddedOpportunities(
  opportunities: readonly OpportunityRecord[],
  accounts: readonly { appName: string }[],
) {
  const names = new Set(accounts.map((account) => account.appName.trim().toLowerCase()));
  return opportunities.filter((row) => {
    const name = (row.app ?? row.title).trim().toLowerCase();
    return name.length > 0 && !names.has(name);
  });
}
