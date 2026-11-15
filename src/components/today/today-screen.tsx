import { Circle, CircleCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EarningsChart } from "@/components/today/earnings-chart";
import { TodayHeading } from "@/components/today/today-heading";
import { cn } from "@/lib/cn";
import { deltaCopy, formatUsd, type OpportunityView, type TodayView } from "@/lib/today-model";

const rowClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function OpportunityCard({ item }: { item: OpportunityView }) {
  return (
    <Card interactive className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-sm font-semibold text-foreground">
            {item.initial}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{item.name}</h3>
            <p className="mt-1 text-xs text-secondary">{item.detail}</p>
          </div>
        </div>
        {item.score != null ? <ScoreBadge score={item.score} /> : null}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-secondary">Est. value</dt>
          <dd className="mt-1 text-sm text-foreground tabular-nums">{item.payoutLabel}</dd>
        </div>
        <div>
          <dt className="text-secondary">Time</dt>
          <dd className="mt-1 text-sm text-foreground">{item.minutesLabel}</dd>
        </div>
        <div>
          <dt className="text-secondary">$/hr</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">{item.hourlyLabel}</dd>
        </div>
      </dl>
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="flex flex-wrap gap-2">
          {item.platform ? (
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-secondary">{item.platform}</span>
          ) : null}
          {item.source ? (
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-secondary">{item.source}</span>
          ) : null}
        </div>
        {item.href ? (
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </Card>
  );
}

function OpportunityRow({ item }: { item: OpportunityView }) {
  const body = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
        {item.initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{item.name}</span>
        <span className="block truncate text-xs text-secondary">{item.detail}</span>
      </span>
      <span className="text-sm font-semibold text-foreground tabular-nums">{item.hourlyLabel}</span>
      {item.score != null ? <ScoreBadge score={item.score} /> : null}
    </>
  );

  if (!item.href) {
    return <div className={rowClass}>{body}</div>;
  }

  return (
    <a href={item.href} target="_blank" rel="noreferrer noopener" className={rowClass}>
      {body}
    </a>
  );
}

function ChecklistRow({ item }: { item: OpportunityView }) {
  const body = (
    <>
      {item.completed ? (
        <CircleCheck className="size-4 shrink-0 text-secondary" aria-hidden="true" />
      ) : (
        <Circle className="size-4 shrink-0 text-secondary" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm",
            item.completed ? "text-secondary" : "text-foreground",
          )}
        >
          {item.name}
        </span>
        <span className="block truncate text-xs text-secondary">{item.detail}</span>
      </span>
      <span className="sr-only">{item.completed ? "Completed" : "Not completed"}</span>
    </>
  );

  if (!item.href) {
    return <li className={rowClass}>{body}</li>;
  }

  return (
    <li>
      <a href={item.href} target="_blank" rel="noreferrer noopener" className={rowClass}>
        {body}
      </a>
    </li>
  );
}

export function TodayScreen({
  name,
  view,
  sample = false,
}: {
  name: string;
  view: TodayView;
  sample?: boolean;
}) {
  const todayDelta =
    view.stats.todayDeltaCents == null
      ? undefined
      : deltaCopy(view.stats.todayDeltaCents, "vs yesterday");
  const weekDelta =
    view.stats.weekDeltaCents == null
      ? undefined
      : deltaCopy(view.stats.weekDeltaCents, "vs last week");
  const pendingDetail =
    view.stats.pendingCount === 1
      ? "1 payout processing"
      : `${view.stats.pendingCount} payouts processing`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {sample ? (
            <p className="mb-3 inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
              SAMPLE DATA. All numbers are mock. Not real offers, payouts, or accounts.
            </p>
          ) : null}
          <TodayHeading
            name={name}
            summary={`${view.readyCount} ready. ${view.vettedCount} passed vetting.`}
          />
        </div>
        {sample ? (
          <Button href="/today" variant="secondary">
            Hide sample data
          </Button>
        ) : null}
      </header>

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        <div className="w-[68vw] max-w-xs shrink-0 snap-start md:w-auto md:max-w-none">
          <StatCard label="Earned today" value={formatUsd(view.stats.todayCents)} delta={todayDelta} />
        </div>
        <div className="w-[68vw] max-w-xs shrink-0 snap-start md:w-auto md:max-w-none">
          <StatCard label="This week" value={formatUsd(view.stats.weekCents)} delta={weekDelta} />
        </div>
        <div className="w-[68vw] max-w-xs shrink-0 snap-start md:w-auto md:max-w-none">
          <StatCard
            label="This month"
            value={formatUsd(view.stats.monthCents)}
            detail={
              view.stats.paceCents == null
                ? undefined
                : `On pace for ${formatUsd(view.stats.paceCents)}`
            }
          />
        </div>
        <div className="w-[68vw] max-w-xs shrink-0 snap-start md:w-auto md:max-w-none">
          <StatCard
            label="Pending payouts"
            value={formatUsd(view.stats.pendingCents)}
            detail={pendingDetail}
          />
        </div>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <section id="checklist" className="order-1 h-full lg:order-2">
          <Card className="h-full">
            <h2 className="text-sm font-semibold text-foreground">Daily checklist</h2>
            <p className="mt-1 text-sm text-secondary">
              Remind-only. These apps ban bots, so you tap the final step yourself.
            </p>
            {view.checklist.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No daily checklist"
                  description="Add an opportunity with a Daily bonus category. Nothing here is claimed for you."
                />
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <ProgressBar
                    label="Completed"
                    value={view.checklistDone}
                    max={view.checklist.length}
                  />
                </div>
                <ul className="mt-3 space-y-1">
                  {view.checklist.map((item) => (
                    <ChecklistRow key={item.id} item={item} />
                  ))}
                </ul>
              </>
            )}
          </Card>
        </section>

        <div className="order-2 flex h-full flex-col gap-4 lg:order-1">
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Top opportunities</h2>
              <p className="text-xs text-secondary">Ranked by $/hr</p>
            </div>
            {view.topOpportunities.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No opportunities yet"
                  description="Tasks that are not rejected show up here, highest dollars per hour first."
                />
              </div>
            ) : (
              <>
                <div className="mt-4 hidden items-stretch gap-3 md:grid md:grid-cols-2">
                  {view.topOpportunities.map((item) => (
                    <OpportunityCard key={item.id} item={item} />
                  ))}
                </div>
                <ul className="mt-2 md:hidden">
                  {view.topOpportunities.map((item) => (
                    <li key={item.id}>
                      <OpportunityRow item={item} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <Card className="flex-1">
            <EarningsChart chart={view.chart} />
          </Card>
        </div>
      </div>
    </div>
  );
}
