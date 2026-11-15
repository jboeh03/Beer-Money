"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CharCounter } from "@/components/ui/char-counter";
import { CopyButton } from "@/components/ui/copy-button";
import { Drawer } from "@/components/ui/drawer";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScoreBadge } from "@/components/ui/score-badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  SortButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useColumnSort,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import type { RewardStatus } from "@/lib/database.types";

type SampleRow = {
  name: string;
  rate: number;
  score: number;
  status: RewardStatus;
};

const SAMPLE_ROWS: readonly SampleRow[] = [
  { name: "Sample surveys", rate: 10, score: 92, status: "vetted" },
  { name: "Sample receipts", rate: 12, score: 64, status: "queued" },
  { name: "Sample cashback", rate: 1, score: 35, status: "rejected" },
  { name: "Sample quest", rate: 18.75, score: 81, status: "claimed" },
  { name: "Sample promo", rate: 8, score: 50, status: "paid" },
  { name: "Sample new task", rate: 12, score: 74, status: "new" },
];

const STATUSES: readonly RewardStatus[] = [
  "new",
  "vetted",
  "queued",
  "claimed",
  "paid",
  "rejected",
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ComponentGallery() {
  const { sorted, sort, toggle } = useColumnSort(SAMPLE_ROWS, "rate", "desc");
  const [grouping, setGrouping] = useState("category");
  const [draft, setDraft] = useState("Sample post. This is fictional copy. #ad");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [retryNote, setRetryNote] = useState("");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <header>
        <p className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
          SAMPLE DATA. All numbers are mock. Not real offers, payouts, or accounts.
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Components</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary">
          Shared pieces for later screens. Amber is only the primary button, the
          active nav item, and the selected toggle. Scores use red below 50, amber
          from 50 to 74, and green from 75 up.
        </p>
      </header>

      <Section title="Buttons" description="Primary, secondary, ghost, disabled, and loading. Remind-only stays secondary, not amber.">
        <div className="flex flex-wrap gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Remind-only</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Save</Button>
        </div>
      </Section>

      <Section title="Cards" description="Cards in a row stretch to the same height. Hover the first card, then tab to the button inside it.">
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          <Card interactive>
            <h3 className="text-sm font-semibold">Sample short card</h3>
            <p className="mt-2 text-sm text-secondary">One line of sample copy.</p>
            <div className="mt-auto pt-4">
              <Button variant="secondary" size="sm">
                Remind-only
              </Button>
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Sample longer card</h3>
            <p className="mt-2 text-sm text-secondary">
              This fictional card has more text so the row can show equal heights.
              The button on the short card sits on the bottom edge with the others.
            </p>
            <div className="mt-auto pt-4">
              <Button variant="secondary" size="sm">
                Open sample
              </Button>
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Sample note</h3>
            <p className="mt-2 text-sm text-secondary">Neutral body text. Not a positive delta.</p>
            <div className="mt-auto pt-4">
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(true)}>
                Open drawer
              </Button>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Stats" description="The value stays neutral. Green is only a positive change. A plain detail such as payouts processing is not green.">
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          <StatCard
            label="Earned today"
            value="$4.85"
            delta={{ direction: "up", label: "+$1.10 vs yesterday" }}
          />
          <StatCard
            label="This week"
            value="$31.20"
            delta={{ direction: "down", label: "−$2.00 vs last week" }}
          />
          <StatCard label="Pending payouts" value="$22.50" detail="3 payouts processing" />
        </div>
      </Section>

      <Section title="Status" description="Claimed and paid use different colors, and each pill has an icon and a label.">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <StatusPill key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Vetter score and priority" description="Priority stays neutral at every number. The score color changes at 50 and at 75.">
        <div className="flex flex-wrap items-center gap-6">
          {[35, 50, 74, 75, 92].map((score) => (
            <span key={score} className="flex flex-col gap-1">
              <span className="text-xs text-secondary">Score</span>
              <ScoreBadge score={score} />
            </span>
          ))}
          {[94, 64, 35].map((priority) => (
            <span key={priority} className="flex flex-col gap-1">
              <span className="text-xs text-secondary">Priority</span>
              <PriorityBadge value={priority} />
            </span>
          ))}
        </div>
      </Section>

      <Section title="Sortable table" description="Sample rows. Click a header to sort. The active arrow shows the direction. Default is dollars per hour, highest first.">
        <Table>
          <TableHeader>
            <tr>
              <TableHead sorted={sort.key === "name" ? sort.direction : "none"}>
                <SortButton
                  label="Name"
                  active={sort.key === "name"}
                  direction={sort.direction}
                  onSort={() => toggle("name")}
                />
              </TableHead>
              <TableHead sorted={sort.key === "rate" ? sort.direction : "none"}>
                <SortButton
                  label="$/hr"
                  active={sort.key === "rate"}
                  direction={sort.direction}
                  onSort={() => toggle("rate")}
                />
              </TableHead>
              <TableHead sorted={sort.key === "score" ? sort.direction : "none"}>
                <SortButton
                  label="Vetter score"
                  active={sort.key === "score"}
                  direction={sort.direction}
                  onSort={() => toggle("score")}
                />
              </TableHead>
              <TableHead sorted={sort.key === "status" ? sort.direction : "none"}>
                <SortButton
                  label="Status"
                  active={sort.key === "status"}
                  direction={sort.direction}
                  onSort={() => toggle("status")}
                />
              </TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.name}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="tabular-nums">${row.rate.toFixed(2)}</TableCell>
                <TableCell>
                  <ScoreBadge score={row.score} />
                </TableCell>
                <TableCell>
                  <StatusPill status={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Progress, toggle, copy, and counter">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <ProgressBar label="Sample checklist" value={4} max={10} />
            <div className="mt-5">
              <SegmentedControl
                label="Sample referral view"
                value={grouping}
                onChange={setGrouping}
                options={[
                  { value: "category", label: "Group by category" },
                  { value: "priority", label: "Sort by priority" },
                ]}
              />
              <p className="mt-3 text-sm text-secondary">
                {grouping === "category"
                  ? "Sample view: grouped by category."
                  : "Sample view: sorted by priority."}
              </p>
            </div>
          </Card>
          <Card>
            <label htmlFor="sample-post" className="text-sm font-medium">
              Sample post
            </label>
            <textarea
              id="sample-post"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <div className="mt-2">
              <CharCounter value={draft} max={280} label="X characters" />
            </div>
            <div className="mt-4">
              <CopyButton value="https://example.com/sample-referral" />
              <p className="mt-2 text-xs text-secondary">Copies a fictional example.com link.</p>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Empty, loading, and error">
        <div className="grid gap-4 lg:grid-cols-3">
          <EmptyState
            title="No sample rows"
            description="Nothing matched this fictional filter."
            action={<Button variant="secondary">Clear sample filter</Button>}
          />
          <Card>
            <LoadingSkeleton />
          </Card>
          <div>
            <ErrorState
              title="Sample request failed"
              description="This error is fake. Retry does not call a service."
              onRetry={() => setRetryNote("Sample retry clicked.")}
            />
            {retryNote ? <p className="mt-2 text-xs text-secondary">{retryNote}</p> : null}
          </div>
        </div>
      </Section>

      <Drawer open={drawerOpen} title="Sample detail" onClose={() => setDrawerOpen(false)}>
        <p className="text-sm text-secondary">
          SAMPLE detail for a fictional task. Not a real offer and not something to claim.
        </p>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="text-xs text-secondary">Status</dt>
            <dd className="mt-1">
              <StatusPill status="vetted" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-secondary">Vetter score</dt>
            <dd className="mt-1">
              <ScoreBadge score={82} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-secondary">Priority</dt>
            <dd className="mt-1">
              <PriorityBadge value={2} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-secondary">Rate</dt>
            <dd className="mt-1 text-foreground tabular-nums">$10.00/hr</dd>
          </div>
        </dl>
      </Drawer>
    </div>
  );
}
