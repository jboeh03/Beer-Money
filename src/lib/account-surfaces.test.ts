import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRecord } from "./accounts-model";
import {
  checklistFromAccounts,
  mergeReferralRows,
  opportunityMatchesApp,
  referralLinksFromAccounts,
} from "./account-surfaces";
import type { ReferralRecord } from "./referrals-model";

function account(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: "acct-1",
    appName: "Shuffle.us",
    category: "Social casino",
    username: null,
    referralUrl: "https://shuffle.us/r/jeff",
    referralCode: "JEFF",
    cadence: "daily",
    notes: null,
    ...overrides,
  };
}

test("checklist uses real accounts and skips a cadence of none", () => {
  const items = checklistFromAccounts([
    account(),
    account({ id: "acct-2", appName: "No bonus", cadence: "none", category: "Crypto" }),
    account({ id: "acct-3", appName: "Coin app", cadence: "24h", category: "Crypto", referralUrl: null }),
  ]);
  assert.deepEqual(
    items.map((item) => item.name),
    ["Coin app", "Shuffle.us"],
  );
  assert.equal(items[0]?.completed, false);
  assert.equal(items[0]?.hourly, null);
  assert.equal(items[1]?.href, "https://shuffle.us/r/jeff");
  assert.match(items[1]?.detail ?? "", /Daily bonus/);
});

test("opportunity matching uses the app name and does not invent a hit", () => {
  const apps = [{ appName: "Shuffle.us", category: "Social casino" }];
  assert.equal(opportunityMatchesApp({ app: "shuffle.us", title: "Daily" }, apps), true);
  assert.equal(opportunityMatchesApp({ app: null, title: "Shuffle.us" }, apps), true);
  assert.equal(opportunityMatchesApp({ app: "Sample Surveys", title: "Sample" }, apps), false);
});

test("referral rows come from stored links and codes without signup counts", () => {
  const rows = referralLinksFromAccounts([
    account(),
    account({
      id: "acct-2",
      appName: "Code only",
      referralUrl: null,
      referralCode: "CODE",
      category: "Fintech",
    }),
    account({ id: "acct-3", appName: "Plain", referralUrl: null, referralCode: null }),
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.metricsRecorded, false);
  assert.equal(rows[0]?.signups, 0);
  assert.equal(rows[0]?.payoutPerSignupCents, null);
  assert.equal(rows[0]?.copyValue, "https://shuffle.us/r/jeff");
  assert.equal(rows[1]?.copyValue, "CODE");
  assert.equal(rows[1]?.url, null);
});

test("stored referral links stay separate from account links with the same url", () => {
  const stored: ReferralRecord = {
    id: "stored-1",
    label: "Shuffle.us",
    category: "Social casino",
    app: "Shuffle.us",
    platform: null,
    url: "https://shuffle.us/r/jeff",
    ratePercent: null,
    payoutPerSignupCents: 100,
    signups: 2,
    priority: 10,
    status: "vetted",
    notes: null,
    metricsRecorded: true,
  };
  const merged = mergeReferralRows(stored ? [stored] : [], referralLinksFromAccounts([account()]));
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.signups, 2);
});
