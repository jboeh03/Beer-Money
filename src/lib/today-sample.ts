import {
  buildTodayView,
  utcDay,
  type OpportunityInput,
  type PayoutInput,
  type TodayView,
} from "@/lib/today-model";

function dayOffset(now: Date, offset: number): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + offset);
  return utcDay(date);
}

function opportunity(
  input: Pick<OpportunityInput, "id" | "title" | "category" | "status"> &
    Partial<OpportunityInput>,
): OpportunityInput {
  return {
    app: null,
    source: null,
    platform: null,
    payoutCents: null,
    estMinutes: null,
    dollarsPerHour: null,
    vetterScore: null,
    externalUrl: null,
    notes: null,
    priority: 0,
    ...input,
  };
}

// Fictional rows for the explicit sample preview. Not real offers or payouts.
export function sampleTodayView(now: Date): TodayView {
  const opportunities: OpportunityInput[] = [
    opportunity({
      id: "sample-surveys",
      title: "Finish a fictional intro lesson",
      app: "Sample Surveys",
      category: "Sample surveys",
      status: "vetted",
      source: "Sample mail",
      platform: "Web",
      payoutCents: 300,
      estMinutes: 4,
      vetterScore: 92,
      externalUrl: "https://example.com/sample-survey",
      notes: "SAMPLE task. Do not treat this as a real lesson.",
      priority: 1,
    }),
    opportunity({
      id: "sample-receipts",
      title: "Scan a fictional receipt",
      app: "Sample Receipts",
      category: "Sample receipts",
      status: "vetted",
      source: "Sample",
      platform: "iOS",
      payoutCents: 200,
      estMinutes: 3,
      vetterScore: 74,
      externalUrl: "https://example.com/sample-receipt",
      notes: "SAMPLE task.",
      priority: 2,
    }),
    opportunity({
      id: "sample-quest",
      title: "Reach a fictional board",
      app: "Sample Quest",
      category: "Sample quests",
      status: "new",
      source: "Sample",
      platform: "Web",
      payoutCents: 500,
      estMinutes: 10,
      vetterScore: 50,
      externalUrl: "https://example.com/sample-quest",
      notes: "SAMPLE task with a longer note so the card row can stretch.",
      priority: 3,
    }),
    opportunity({
      id: "sample-low",
      title: "A low-score fictional offer",
      app: "Sample Cashback",
      category: "Sample cashback",
      status: "queued",
      source: "Sample",
      platform: "Android",
      payoutCents: 1800,
      estMinutes: 60,
      vetterScore: 35,
      externalUrl: "https://example.com/sample-low",
      notes: "SAMPLE task. The score is below 50, so it is red.",
      priority: 4,
    }),
    opportunity({
      id: "sample-rejected",
      title: "Rejected fictional task",
      app: "Sample Rejected",
      category: "Sample surveys",
      status: "rejected",
      payoutCents: 9000,
      estMinutes: 5,
      vetterScore: 10,
      priority: 0,
    }),
    ...Array.from({ length: 10 }, (_, index) =>
      opportunity({
        id: `sample-daily-${index + 1}`,
        title: index < 4 ? "Sample daily check, already done" : "Sample daily check",
        app: `Sample Bonus ${index + 1}`,
        category: "Daily bonus",
        status: index < 4 ? (index % 2 === 0 ? "paid" : "claimed") : "vetted",
        source: "Sample",
        platform: "Web",
        payoutCents: 25,
        estMinutes: 1,
        vetterScore: 80,
        externalUrl: `https://example.com/sample-daily-${index + 1}`,
        notes: "SAMPLE daily bonus. You would open this yourself.",
        priority: index + 1,
      }),
    ),
  ];

  const categories = ["Sample surveys", "Sample cashback", "Sample receipts", "Sample referrals"];
  const payouts: PayoutInput[] = [
    { id: "pending-1", amountCents: 800, status: "queued", category: "Sample surveys", paidOn: null, createdAt: now.toISOString() },
    { id: "pending-2", amountCents: 700, status: "claimed", category: "Sample receipts", paidOn: null, createdAt: now.toISOString() },
    { id: "pending-3", amountCents: 750, status: "queued", category: "Sample referrals", paidOn: null, createdAt: now.toISOString() },
    { id: "today-paid", amountCents: 485, status: "paid", category: "Sample surveys", paidOn: dayOffset(now, 0), createdAt: now.toISOString() },
    { id: "yesterday-paid", amountCents: 375, status: "paid", category: "Sample cashback", paidOn: dayOffset(now, -1), createdAt: now.toISOString() },
  ];

  for (let offset = 0; offset > -7; offset -= 1) {
    categories.forEach((category, index) => {
      if ((Math.abs(offset) + index) % 3 === 0) {
        return;
      }
      payouts.push({
        id: `sample-paid-${offset}-${index}`,
        amountCents: 120 + index * 80 + Math.abs(offset) * 40,
        status: "paid",
        category,
        paidOn: dayOffset(now, offset),
        createdAt: now.toISOString(),
      });
    });
  }

  return buildTodayView(opportunities, payouts, now);
}
