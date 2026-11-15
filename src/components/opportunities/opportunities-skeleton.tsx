import { AppShell } from "@/components/shell/app-shell";
import { LoadingSkeleton } from "@/components/ui/states";

export function OpportunitiesSkeleton() {
  return (
    <AppShell activeHref="/opportunities">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
        <LoadingSkeleton label="Loading opportunities" />
      </div>
    </AppShell>
  );
}
