import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ReferralBoard } from "@/components/referrals/referral-board";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadReferrals } from "@/lib/referrals-data";
import { sampleReferrals } from "@/lib/referrals-sample";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Referral hub · Beer Money",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ReferralFallback() {
  return (
    <AppShell activeHref="/referral-hub">
      <LoadingSkeleton label="Loading referral links" />
    </AppShell>
  );
}

async function ReferralContent({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[] }>;
}) {
  const sample = firstParam((await searchParams).sample) === "1";
  const loaded = await loadReferrals();

  if (loaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error") {
    return (
      <AppShell activeHref="/referral-hub">
        <ErrorState
          title="Referral links could not load"
          description="Nothing was copied or submitted."
        />
        <div className="mt-4">
          <Button href="/referral-hub" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (sample) {
    return (
      <AppShell activeHref="/referral-hub">
        <ReferralBoard rows={sampleReferrals()} sample />
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/referral-hub">
        <SetupNotice />
      </AppShell>
    );
  }

  if (loaded.status === "empty") {
    return (
      <AppShell activeHref="/referral-hub">
        <EmptyState
          title="No referral links yet"
          description="Links you add will show up here. Copy stays manual."
          action={
            <Button href="/referral-hub?sample=1" variant="secondary">
              Preview with sample data
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/referral-hub">
      <ReferralBoard rows={loaded.rows} />
    </AppShell>
  );
}

export default function ReferralHubPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<ReferralFallback />}>
      <ReferralContent searchParams={searchParams} />
    </Suspense>
  );
}
