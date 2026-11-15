import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MatcherBoard } from "@/components/matcher/matcher-board";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
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
  const loaded = await loadOffers();

  if (loaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error") {
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

  if (sample) {
    return (
      <AppShell activeHref="/best-offer-matcher">
        <MatcherBoard rows={sampleOffers()} sample />
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/best-offer-matcher">
        <SetupNotice />
      </AppShell>
    );
  }

  if (loaded.status === "empty") {
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
      <MatcherBoard rows={loaded.rows} />
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
