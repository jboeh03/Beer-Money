import { Suspense } from "react";
import { redirect } from "next/navigation";
import { addExploredAccount } from "@/app/accounts/actions";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatusPill } from "@/components/ui/status-pill";
import { SetupNotice } from "@/components/setup-notice";
import { loadAccountArea } from "@/lib/accounts-data";
import { unaddedOpportunities } from "@/lib/accounts-model";
import { loadOpportunities } from "@/lib/opportunities-data";
import { opportunityName } from "@/lib/opportunities-model";
import { sampleOpportunities } from "@/lib/opportunities-sample";
import type { OpportunityRecord } from "@/lib/opportunities-model";

export const dynamic = "force-dynamic";

export const metadata = { title: "Explore · Beer Money" };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ExploreTable({
  rows,
  sample,
}: {
  rows: OpportunityRecord[];
  sample: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing new to add"
        description="Every opportunity app is already in My accounts, or there are no opportunities yet."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-xs text-secondary">
          <tr>
            <th className="h-11 px-3 font-medium">App</th>
            <th className="hidden h-11 px-3 font-medium sm:table-cell">Category</th>
            <th className="h-11 px-3 font-medium">Status</th>
            <th className="h-11 px-3 font-medium">
              <span className="sr-only">Add</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-3 py-3">
                <span className="block font-medium text-foreground">{opportunityName(row)}</span>
                <span className="block text-xs text-secondary">{row.title}</span>
              </td>
              <td className="hidden px-3 py-3 text-secondary sm:table-cell">{row.category ?? "—"}</td>
              <td className="px-3 py-3">
                <StatusPill status={row.status} />
              </td>
              <td className="px-3 py-3">
                {sample ? (
                  <span className="text-xs text-secondary">Sample only</span>
                ) : (
                  <form action={addExploredAccount}>
                    <input type="hidden" name="app_name" value={opportunityName(row)} />
                    <input type="hidden" name="category" value={row.category ?? "other"} />
                    <Button type="submit" variant="secondary" size="sm">
                      Add to my accounts
                    </Button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ExploreContent({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const sample = firstParam(params.sample) === "1";
  const error = firstParam(params.error);
  const accounts = await loadAccountArea();

  if (accounts.status === "signed-out") {
    redirect("/");
  }
  if (accounts.status === "error") {
    return (
      <AppShell activeHref="/explore">
        <ErrorState title="Explore could not load" description="Nothing was added." />
      </AppShell>
    );
  }

  if (sample) {
    const rows = unaddedOpportunities(sampleOpportunities(), [{ appName: "Sample Surveys" }]);
    return (
      <AppShell activeHref="/explore">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <p className="inline-flex w-fit rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
            SAMPLE DATA. All rows are mock. Adding is disabled.
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Explore</h1>
          <ExploreTable rows={rows} sample />
          <Button href="/explore" variant="secondary">
            Hide sample data
          </Button>
        </div>
      </AppShell>
    );
  }

  if (accounts.status === "unconfigured") {
    return (
      <AppShell activeHref="/explore">
        <SetupNotice />
      </AppShell>
    );
  }

  const opportunities = await loadOpportunities();
  if (opportunities.status === "error" || opportunities.status === "signed-out") {
    return (
      <AppShell activeHref="/explore">
        <ErrorState title="Opportunities could not load" description="Nothing was added." />
      </AppShell>
    );
  }
  if (opportunities.status === "unconfigured" || opportunities.status === "empty") {
    return (
      <AppShell activeHref="/explore">
        <EmptyState
          title="No apps to explore"
          description="Opportunities you have not added will show up here."
          action={
            <Button href="/explore?sample=1" variant="secondary">
              Preview with sample data
            </Button>
          }
        />
      </AppShell>
    );
  }

  const rows = unaddedOpportunities(opportunities.rows, accounts.accounts);

  return (
    <AppShell activeHref="/explore">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Explore</h1>
        <p className="text-sm text-secondary">
          Apps from your opportunities that are not in My accounts yet.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-negative">
            That app could not be added.
          </p>
        ) : null}
        <ExploreTable rows={rows} sample={false} />
      </div>
    </AppShell>
  );
}

export default function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[]; error?: string | string[] }>;
}) {
  return (
    <Suspense>
      <ExploreContent searchParams={searchParams} />
    </Suspense>
  );
}
