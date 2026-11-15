import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { TodayScreen } from "@/components/today/today-screen";
import { TodaySkeleton } from "@/components/today/today-skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadToday } from "@/lib/today-data";
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
  const loaded = await loadToday();

  if (loaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error") {
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

  if (sample) {
    const name = loaded.status === "unconfigured" ? "there" : loaded.name;
    return (
      <AppShell activeHref="/today">
        <TodayScreen name={name} view={sampleTodayView(new Date())} sample />
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/today">
        <SetupNotice />
      </AppShell>
    );
  }

  if (loaded.status === "empty") {
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

  return (
    <AppShell
      activeHref="/today"
      counts={{ opportunities: loaded.view.readyCount }}
    >
      <TodayScreen name={loaded.name} view={loaded.view} />
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
