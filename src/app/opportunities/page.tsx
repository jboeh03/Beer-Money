import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OpportunitiesBoard } from "@/components/opportunities/opportunities-board";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadAccountArea } from "@/lib/accounts-data";
import { ownerApps } from "@/lib/account-surfaces";
import { loadOpportunities } from "@/lib/opportunities-data";
import { sampleOpportunities } from "@/lib/opportunities-sample";
import { OpportunitiesSkeleton } from "@/components/opportunities/opportunities-skeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities · Beer Money",
};

const ERRORS: Record<string, string> = {
  title: "A title is required.",
  save: "That lead could not be saved.",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function OpportunitiesContent({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const sample = firstParam(params.sample) === "1";
  const errorCode = firstParam(params.error);
  const [loaded, accountsLoaded] = await Promise.all([loadOpportunities(), loadAccountArea()]);

  if (loaded.status === "signed-out" || accountsLoaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error" && accountsLoaded.status !== "ready") {
    return (
      <AppShell activeHref="/opportunities">
        <ErrorState
          title="Opportunities could not load"
          description="Your tasks could not be read. Nothing was claimed or submitted."
        />
        <div className="mt-4">
          <Button href="/opportunities" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured" || accountsLoaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/opportunities">
        <SetupNotice />
      </AppShell>
    );
  }

  const realRows = loaded.status === "ready" ? loaded.rows : [];
  const yourApps = accountsLoaded.status === "ready" ? ownerApps(accountsLoaded.accounts) : [];
  const showSampleFeed = sample && realRows.length === 0;

  if (accountsLoaded.status === "error" && realRows.length === 0 && loaded.status !== "ready") {
    return (
      <AppShell activeHref="/opportunities">
        <ErrorState
          title="Opportunities could not load"
          description="Your accounts could not be read. Nothing was claimed or submitted."
        />
        <div className="mt-4">
          <Button href="/opportunities" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (realRows.length === 0 && yourApps.length === 0 && showSampleFeed) {
    return (
      <AppShell activeHref="/opportunities">
        <OpportunitiesBoard
          rows={sampleOpportunities()}
          sample
          error={errorCode ? ERRORS[errorCode] : undefined}
        />
      </AppShell>
    );
  }

  if (realRows.length === 0 && yourApps.length === 0) {
    return (
      <AppShell activeHref="/opportunities">
        <EmptyState
          title="No opportunities yet"
          description="Leads you add will show up here. Claims stay manual."
          action={
            <Button href="/opportunities?sample=1" variant="secondary">
              Preview with sample data
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      activeHref="/opportunities"
      counts={{ opportunities: realRows.filter((row) => row.status !== "rejected").length }}
    >
      <OpportunitiesBoard
        rows={showSampleFeed ? sampleOpportunities() : realRows}
        sample={showSampleFeed}
        yourApps={yourApps}
        error={errorCode ? ERRORS[errorCode] : undefined}
      />
    </AppShell>
  );
}

export default function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[]; error?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<OpportunitiesSkeleton />}>
      <OpportunitiesContent searchParams={searchParams} />
    </Suspense>
  );
}
