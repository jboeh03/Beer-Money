import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MatcherBoard } from "@/components/matcher/matcher-board";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadAccountArea } from "@/lib/accounts-data";
import { ownerApps } from "@/lib/account-surfaces";
import { loadOffers } from "@/lib/offers-data";
import { sampleOffers } from "@/lib/offers-sample";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Best-offer matcher · Beer Money",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function MatcherFallback() {
  return (
    <AppShell activeHref="/best-offer-matcher">
      <LoadingSkeleton label="Loading offers" />
    </AppShell>
  );
}

async function MatcherContent({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[] }>;
}) {
  const sample = firstParam((await searchParams).sample) === "1";
  const [loaded, accountsLoaded] = await Promise.all([loadOffers(), loadAccountArea()]);

  if (loaded.status === "signed-out" || accountsLoaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error" && accountsLoaded.status !== "ready") {
    return (
      <AppShell activeHref="/best-offer-matcher">
        <ErrorState
          title="Offers could not load"
          description="Nothing was opened or submitted."
        />
        <div className="mt-4">
          <Button href="/best-offer-matcher" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured" || accountsLoaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/best-offer-matcher">
        <SetupNotice />
      </AppShell>
    );
  }

  const realRows = loaded.status === "ready" ? loaded.rows : [];
  const apps = accountsLoaded.status === "ready" ? ownerApps(accountsLoaded.accounts) : [];
  const showSampleFeed = sample && realRows.length === 0;

  if (accountsLoaded.status === "error" && realRows.length === 0 && loaded.status !== "ready") {
    return (
      <AppShell activeHref="/best-offer-matcher">
        <ErrorState
          title="Offers could not load"
          description="Your accounts could not be read. Nothing was opened or submitted."
        />
        <div className="mt-4">
          <Button href="/best-offer-matcher" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (realRows.length === 0 && apps.length === 0 && showSampleFeed) {
    return (
      <AppShell activeHref="/best-offer-matcher">
        <MatcherBoard rows={sampleOffers()} sample />
      </AppShell>
    );
  }

  if (realRows.length === 0 && apps.length === 0) {
    return (
      <AppShell activeHref="/best-offer-matcher">
        <EmptyState
          title="No offers yet"
          description="Offers you add will show up here for comparison. Nothing is opened for you."
          action={
            <Button href="/best-offer-matcher?sample=1" variant="secondary">
              Preview with sample data
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/best-offer-matcher">
      <MatcherBoard
        rows={showSampleFeed ? sampleOffers() : realRows}
        sample={showSampleFeed}
        apps={apps}
      />
    </AppShell>
  );
}

export default function BestOfferMatcherPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<MatcherFallback />}>
      <MatcherContent searchParams={searchParams} />
    </Suspense>
  );
}
