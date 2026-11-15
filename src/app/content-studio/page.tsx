import { Suspense } from "react";
import { redirect } from "next/navigation";
import { StudioBoard } from "@/components/studio/studio-board";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadPosts } from "@/lib/posts-data";
import { samplePosts } from "@/lib/posts-sample";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content studio · Beer Money",
};

const ERRORS: Record<string, string> = {
  disclosure: "A draft needs a disclosure that includes #ad. Nothing was posted.",
  save: "That draft could not be saved. Nothing was posted.",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function StudioFallback() {
  return (
    <AppShell activeHref="/content-studio">
      <LoadingSkeleton label="Loading drafts" />
    </AppShell>
  );
}

async function StudioContent({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const sample = firstParam(params.sample) === "1";
  const errorCode = firstParam(params.error);
  const loaded = await loadPosts();

  if (loaded.status === "signed-out") {
    redirect("/");
  }

  if (loaded.status === "error") {
    return (
      <AppShell activeHref="/content-studio">
        <ErrorState
          title="Drafts could not load"
          description="Nothing was posted."
        />
        <div className="mt-4">
          <Button href="/content-studio" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (sample) {
    return (
      <AppShell activeHref="/content-studio">
        <StudioBoard rows={samplePosts()} sample error={errorCode ? ERRORS[errorCode] : undefined} />
      </AppShell>
    );
  }

  if (loaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/content-studio">
        <SetupNotice />
      </AppShell>
    );
  }

  if (loaded.status === "empty") {
    return (
      <AppShell activeHref="/content-studio">
        <EmptyState
          title="No drafts yet"
          description="Drafts you save stay here until you approve them. Nothing is posted."
          action={
            <Button href="/content-studio?sample=1" variant="secondary">
              Preview with sample data
            </Button>
          }
        />
        <div className="mt-6">
          <StudioBoard rows={[]} error={errorCode ? ERRORS[errorCode] : undefined} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/content-studio">
      <StudioBoard rows={loaded.rows} error={errorCode ? ERRORS[errorCode] : undefined} />
    </AppShell>
  );
}

export default function ContentStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string | string[]; error?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<StudioFallback />}>
      <StudioContent searchParams={searchParams} />
    </Suspense>
  );
}
