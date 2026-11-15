import { Suspense } from "react";
import { redirect } from "next/navigation";
import { deleteWalletAddress, saveWalletAddress } from "@/app/accounts/actions";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { SetupNotice } from "@/components/setup-notice";
import { loadAccountArea } from "@/lib/accounts-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Integrations · Beer Money" };

const PLANNED = [
  { name: "Gmail", detail: "Official mail access for lead digests. Not a scraper." },
  { name: "Coinbase", detail: "Read-only account connection planned later." },
  { name: "Reddit API", detail: "Official Reddit API or RSS. Not scraping." },
  { name: "Plaid", detail: "Server-side only. No Plaid token will be put in the browser." },
];

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function IntegrationsContent({
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
      <AppShell activeHref="/settings/integrations">
        <SetupNotice />
      </AppShell>
    );
  }
  if (loaded.status === "error") {
    return (
      <AppShell activeHref="/settings/integrations">
        <ErrorState title="Integrations could not load" description="No connection was started." />
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/settings/integrations">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-secondary">
          Nothing here connects yet. Passwords, seed phrases, private keys, and tokens are never stored.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {PLANNED.map((item) => (
            <Card key={item.name}>
              <h2 className="text-sm font-semibold text-foreground">{item.name}</h2>
              <p className="mt-2 text-sm text-secondary">{item.detail}</p>
              <p className="mt-3 text-xs font-medium text-foreground">Not connected, coming soon</p>
            </Card>
          ))}
        </div>
        <Card>
          <h2 className="text-sm font-semibold text-foreground">Wallet public addresses</h2>
          <p className="mt-2 text-sm text-secondary">
            Save a public address only. This is not a wallet login and it cannot move funds.
          </p>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-negative">
              That value was rejected. Paste a public address, not a seed phrase or private key.
            </p>
          ) : null}
          <form action={saveWalletAddress} className="mt-3 space-y-3">
            <label className="block text-xs text-secondary">
              Label
              <input name="label" className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Public address
              <input name="address" required className={fieldClass} />
            </label>
            <Button type="submit" variant="secondary">
              Save public address
            </Button>
          </form>
          <ul className="mt-4 space-y-2">
            {loaded.wallets.map((wallet) => (
              <li key={wallet.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{wallet.address}</span>
                  {wallet.label ? <span className="text-xs text-secondary">{wallet.label}</span> : null}
                </span>
                <form action={deleteWalletAddress}>
                  <input type="hidden" name="id" value={wallet.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}

export default function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  return (
    <Suspense>
      <IntegrationsContent searchParams={searchParams} />
    </Suspense>
  );
}
