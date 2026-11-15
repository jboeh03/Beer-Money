import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountsBoard } from "@/components/accounts/accounts-board";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadAccountArea } from "@/lib/accounts-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "My accounts · Beer Money" };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function AccountsContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const error = firstParam((await searchParams).error);
  const loaded = await loadAccountArea();

  if (loaded.status === "signed-out") {
    redirect("/");
  }
  if (loaded.status === "unconfigured") {
    return (
      <AppShell activeHref="/accounts">
        <SetupNotice />
      </AppShell>
    );
  }
  if (loaded.status === "error") {
    return (
      <AppShell activeHref="/accounts">
        <ErrorState title="Accounts could not load" description="Nothing secret was stored." />
        <div className="mt-4">
          <Button href="/accounts" variant="secondary">
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/accounts">
      {loaded.accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add an app name, category, and optional referral details. Passwords, seed phrases, private keys, and tokens are never stored."
        />
      ) : null}
      <div className={loaded.accounts.length === 0 ? "mt-6" : undefined}>
        <AccountsBoard accounts={loaded.accounts} error={error ? "save" : undefined} />
      </div>
    </AppShell>
  );
}

export default function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <AppShell activeHref="/accounts">
          <LoadingSkeleton label="Loading accounts" />
        </AppShell>
      }
    >
      <AccountsContent searchParams={searchParams} />
    </Suspense>
  );
}
