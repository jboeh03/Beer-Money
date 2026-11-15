import { AppShell } from "@/components/shell/app-shell";
import { LoadingSkeleton } from "@/components/ui/states";

export function TodaySkeleton() {
  return (
    <AppShell activeHref="/today">
      <div className="mx-auto flex max-w-6xl flex-col gap-4" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="h-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <LoadingSkeleton label="Loading Today" />
      </div>
    </AppShell>
  );
}
