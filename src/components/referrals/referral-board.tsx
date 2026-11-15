"use client";

import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  referralGroups,
  referralStats,
  type ReferralMode,
  type ReferralRecord,
} from "@/lib/referrals-model";
import { formatUsd } from "@/lib/today-model";

const headerClass = "h-11 whitespace-nowrap align-middle";

function ReferralTable({ rows }: { rows: readonly ReferralRecord[] }) {
  return (
    <Table fluid>
      <TableHeader>
        <tr>
          <TableHead className={headerClass}>Platform</TableHead>
          <TableHead className={headerClass}>You get</TableHead>
          <TableHead className={headerClass}>
            <span className="whitespace-nowrap">Sign-ups</span>
          </TableHead>
          <TableHead className={headerClass}>Priority</TableHead>
          <TableHead className={headerClass}>
            <span className="sr-only">Copy link</span>
          </TableHead>
        </tr>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <span className="block font-medium">{row.label}</span>
              <span className="block text-xs text-secondary">{row.app ?? row.platform ?? "—"}</span>
            </TableCell>
            <TableCell className="text-secondary">
              {row.payoutPerSignupCents == null
                ? row.ratePercent == null
                  ? "—"
                  : `${row.ratePercent}%`
                : `${formatUsd(row.payoutPerSignupCents)} per sign-up`}
            </TableCell>
            <TableCell className="tabular-nums">{row.signups}</TableCell>
            <TableCell>
              <PriorityBadge value={row.priority} />
            </TableCell>
            <TableCell>
              {row.url ? <CopyButton value={row.url} label="Copy link" /> : <span className="text-xs text-secondary">No link</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ReferralBoard({ rows, sample = false }: { rows: ReferralRecord[]; sample?: boolean }) {
  const [mode, setMode] = useState<ReferralMode>("category");
  const groups = referralGroups(rows, mode);
  const stats = referralStats(rows);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {sample ? (
            <p className="mb-3 inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
              SAMPLE DATA. All numbers are mock. Not real programs or accounts.
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Referral hub</h1>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            Links you copy yourself. Sign-ups are the stored count, not a live feed.
          </p>
        </div>
        {sample ? (
          <Button href="/referral-hub" variant="secondary">
            Hide sample data
          </Button>
        ) : null}
      </header>

      <div className="grid items-stretch gap-3 md:grid-cols-3">
        <StatCard label="Active links" value={String(stats.activeCount)} detail={`${stats.categories} categories`} />
        <StatCard label="Sign-ups" value={String(stats.signups)} detail="Stored count" />
        <StatCard
          label="Estimated from sign-ups"
          value={formatUsd(stats.estimatedCents)}
          detail={`${stats.pendingCount} queued or claimed`}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="Referral view"
            value={mode}
            onChange={(value) => setMode(value as ReferralMode)}
            options={[
              { value: "category", label: "Group by category" },
              { value: "priority", label: "Sort by priority" },
            ]}
          />
          {groups.map((group) => (
            <section key={group.category} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {group.category}{" "}
                <span className="font-normal text-secondary">{group.rows.length} links</span>
              </h2>
              <ReferralTable rows={group.rows} />
            </section>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-sm font-semibold text-foreground">Top priorities</h2>
            <ol className="mt-3 space-y-3">
              {stats.priorities.map((row, index) => (
                <li key={row.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">
                      {index + 1}. {row.label}
                    </span>
                    <span className="block truncate text-xs text-secondary">{row.notes ?? row.category}</span>
                  </span>
                  <PriorityBadge value={row.priority} />
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-foreground">How priority is scored</h2>
            <p className="mt-2 text-sm text-secondary">
              Priority is the number stored on the link. Higher numbers sort first. The badge stays neutral.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
