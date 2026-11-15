"use client";

import { useMemo, useState } from "react";
import { SampleNotice } from "@/components/sample-notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { compareOffers, offerName, winnerGap, type OfferRecord } from "@/lib/offers-model";
import type { OwnerApp } from "@/lib/account-surfaces";
import { formatUsd } from "@/lib/today-model";

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function hourlyLabel(value: number | null) {
  return value == null ? "—" : `${formatUsd(Math.round(value * 100))}/hr`;
}

export function MatcherBoard({
  rows,
  sample = false,
  apps = [],
}: {
  rows: OfferRecord[];
  sample?: boolean;
  apps?: OwnerApp[];
}) {
  const pageSample = sample && apps.length === 0;
  const [query, setQuery] = useState(pageSample ? "Sample board offer" : "");
  const [platform, setPlatform] = useState("all");
  const [applied, setApplied] = useState({
    query: pageSample ? "Sample board offer" : "",
    platform: "all",
  });

  const compared = useMemo(
    () => compareOffers(rows, applied),
    [rows, applied],
  );
  const result = winnerGap(compared);
  const platforms = [...new Set(rows.map((row) => row.platform).filter((value): value is string => Boolean(value)))].sort();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {pageSample ? (
            <p className="mb-3 inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
              SAMPLE DATA. All numbers are mock. Not real offers or accounts.
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Best-offer matcher</h1>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            Compare payouts for the same task. Highest payout is first. You open the winner yourself.
          </p>
        </div>
        {pageSample ? (
          <Button href="/best-offer-matcher" variant="secondary">
            Hide sample data
          </Button>
        ) : null}
      </header>

      {apps.length > 0 ? (
        <Card>
          <h2 className="text-sm font-semibold text-foreground">Your apps</h2>
          <p className="mt-1 text-sm text-secondary">
            Pick an app to compare stored offers. No payout is invented for an app.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {apps.map((app, index) => {
              const selected = applied.query.trim().toLowerCase() === app.appName.trim().toLowerCase();
              return (
                <button
                  key={`${app.category}-${app.appName}-${index}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setQuery(app.appName);
                    setPlatform("all");
                    setApplied({ query: app.appName, platform: "all" });
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    selected
                      ? "bg-accent text-accent-foreground"
                      : "border border-border text-secondary hover:text-foreground",
                  )}
                >
                  {app.appName}
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {sample && apps.length > 0 ? (
        <>
          <SampleNotice
            label="Offer payouts: sample until Scout is connected"
            active
            hideHref="/best-offer-matcher"
          />
          <p className="text-xs text-secondary">Sample rows are not your accounts.</p>
        </>
      ) : apps.length > 0 && rows.length === 0 ? (
        <SampleNotice
          label="Offer payouts: sample until Scout is connected"
          previewHref="/best-offer-matcher?sample=1"
        />
      ) : null}

      <Card>
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setApplied({ query, platform });
          }}
        >
          <label className="text-xs text-secondary">
            Game or app offer
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the offer title or app"
              className={fieldClass}
            />
          </label>
          <label className="text-xs text-secondary">
            Device
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className={fieldClass}>
              <option value="all">All devices</option>
              {platforms.map((item) => (
                <option key={item} value={item.toLowerCase()}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Compare payouts</Button>
        </form>
      </Card>

      {result ? (
        <div className="rounded-lg border border-foreground/40 bg-card px-4 py-4">
          <p className="text-sm font-semibold text-foreground">
            Highest payout: {offerName(result.winner)}{" "}
            {result.winner.payoutCents == null ? "" : formatUsd(result.winner.payoutCents)}
          </p>
          <p className="mt-1 text-sm text-secondary">
            {result.gapCents == null || result.gapCents <= 0
              ? "No second payout to compare."
              : `${formatUsd(result.gapCents)} more than ${result.next ? offerName(result.next) : "the next offer"}.`}
          </p>
          {result.winner.url ? (
            <a
              href={result.winner.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Open {offerName(result.winner)} yourself
            </a>
          ) : null}
        </div>
      ) : null}

      {compared.length === 0 ? (
        <EmptyState
          title={applied.query ? `No stored offers for ${applied.query}` : "No offers to compare"}
          description={
            apps.length > 0 && applied.query
              ? "Nothing stored matches that app. Sample rows are not treated as yours."
              : "Nothing matched. Rejected offers stay hidden."
          }
        />
      ) : (
        <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          {compared.map((offer, index) => {
            const winner = index === 0 && offer.payoutCents != null;
            return (
              <Card
                key={offer.id}
                interactive
                className={cn("h-full", winner && "border-foreground")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{offerName(offer)}</h2>
                    <p className="mt-1 text-xs text-secondary">{offer.title}</p>
                  </div>
                  {winner ? (
                    <span className="rounded-full border border-border px-2 py-1 text-xs font-medium text-foreground">
                      Best payout
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  {offer.payoutCents == null ? "—" : formatUsd(offer.payoutCents)}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                  {hourlyLabel(offer.hourly)}
                </p>
                <dl className="mt-4 space-y-2 text-xs text-secondary">
                  <div className="flex justify-between gap-3">
                    <dt>Minutes</dt>
                    <dd className="text-foreground tabular-nums">{offer.minutes ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Device</dt>
                    <dd className="text-foreground">{offer.platform ?? "—"}</dd>
                  </div>
                </dl>
                {offer.notes ? <p className="mt-4 text-sm text-secondary">{offer.notes}</p> : null}
                <div className="mt-auto pt-4">
                  {offer.url ? (
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Open yourself
                    </a>
                  ) : (
                    <p className="text-xs text-secondary">No link stored.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
