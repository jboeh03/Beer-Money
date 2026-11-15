import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OpportunitiesBoard } from "@/components/opportunities/opportunities-board";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
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
  const loaded = await loadOpportunities();

  if (loaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error") {
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

  if (sample) {
    return (
      <AppShell activeHref="/opportunities" counts={{ opportunities: sampleOpportunities().filter((row) => row.status !== "rejected").length }}>
        <OpportunitiesBoard
          rows={sampleOpportunities()}
          sample
          error={errorCode ? ERRORS[errorCode] : undefined}
        />
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/opportunities">
        <SetupNotice />
      </AppShell>
    );
  }

  if (loaded.status === "empty") {
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
      counts={{ opportunities: loaded.rows.filter((row) => row.status !== "rejected").length }}
    >
      <OpportunitiesBoard rows={loaded.rows} error={errorCode ? ERRORS[errorCode] : undefined} />
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
