import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { TodayScreen } from "@/components/today/today-screen";
import { TodaySkeleton } from "@/components/today/today-skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadAccountArea } from "@/lib/accounts-data";
import { checklistFromAccounts } from "@/lib/account-surfaces";
import { loadToday } from "@/lib/today-data";
import { buildTodayView } from "@/lib/today-model";
import { sampleTodayView } from "@/lib/today-sample";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Today · Beer Money",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function TodayContent({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[] }>;
}) {
  const params = await searchParams;
  const sample = firstParam(params.sample) === "1";
  const [loaded, accountsLoaded] = await Promise.all([loadToday(), loadAccountArea()]);

  if (loaded.status === "signed-out" || accountsLoaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error" && accountsLoaded.status !== "ready") {
    return (
      <AppShell activeHref="/today">
        <ErrorState
          title="Today could not load"
          description="The opportunities and payouts could not be read. Nothing was claimed or submitted."
        />
        <div className="mt-4">
          <Button href="/today" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured" || accountsLoaded.status === "unconfigured") {
    if (sample) {
      return (
        <AppShell activeHref="/today">
          <TodayScreen name="there" view={sampleTodayView(new Date())} sample />
        </AppShell>
      );
    }
    return (
      <AppShell activeHref="/today">
        <SetupNotice />
      </AppShell>
    );
  }

  const accounts = accountsLoaded.status === "ready" ? accountsLoaded.accounts : [];
  const hasAccounts = accounts.length > 0;
  const hasOpportunities = loaded.status === "ready" && loaded.hasOpportunities;
  const hasPayouts = loaded.status === "ready" && loaded.hasPayouts;
  const name = loaded.status === "ready" || loaded.status === "empty" ? loaded.name : "there";

  if (accountsLoaded.status === "error" && loaded.status !== "ready") {
    return (
      <AppShell activeHref="/today">
        <ErrorState
          title="Today could not load"
          description="Your accounts could not be read. Nothing was claimed or submitted."
        />
        <div className="mt-4">
          <Button href="/today" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!hasAccounts && !hasOpportunities && !hasPayouts && sample) {
    return (
      <AppShell activeHref="/today">
        <TodayScreen name={name} view={sampleTodayView(new Date())} sample />
      </AppShell>
    );
  }

  if (!hasAccounts && loaded.status === "empty") {
    return (
      <AppShell activeHref="/today">
        <EmptyState
          title="Nothing on Today yet"
          description="Opportunities and payouts you add will show up here. Claims stay manual."
          action={
            <Button href="/today?sample=1" variant="secondary">
              Preview with sample data
            </Button>
          }
        />
      </AppShell>
    );
  }

  const view = loaded.status === "ready" ? loaded.view : buildTodayView([], [], new Date());
  const preview = sample && (!hasOpportunities || !hasPayouts);

  return (
    <AppShell activeHref="/today" counts={{ opportunities: view.readyCount }}>
      <TodayScreen
        name={name}
        view={view}
        accountChecklist={hasAccounts ? checklistFromAccounts(accounts) : null}
        fixtureFeed={!hasOpportunities}
        fixtureEarnings={!hasPayouts}
        preview={preview}
        previewView={preview ? sampleTodayView(new Date()) : null}
      />
    </AppShell>
  );
}

export default function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayContent searchParams={searchParams} />
    </Suspense>
  );
}
