"use client";

import { useMemo, useState } from "react";
import { createOpportunity } from "@/app/opportunities/actions";
import { SampleNotice } from "@/components/sample-notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/states";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusPill } from "@/components/ui/status-pill";
import {
  SortButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import {
  filterOpportunities,
  opportunityName,
  sortOpportunities,
  statusCounts,
  STATUS_FILTERS,
  type OpportunityRecord,
  type SortKey,
  type StatusFilter,
} from "@/lib/opportunities-model";
import { opportunityMatchesApp, type OwnerApp } from "@/lib/account-surfaces";
import { formatUsd } from "@/lib/today-model";

const PAGE_SIZE = 10;

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function money(cents: number | null) {
  return cents == null ? "—" : formatUsd(cents);
}

function hourlyLabel(value: number | null) {
  return value == null ? "—" : `${formatUsd(Math.round(value * 100))}/hr`;
}

function downloadCsv(rows: readonly OpportunityRecord[], sample: boolean) {
  const header = [
    "Name",
    "Title",
    "Platform",
    "Type",
    "Source",
    "Est. value",
    "Minutes",
    "$/hr",
    "Vetter score",
    "Requirements",
    "Status",
  ];
  const lines = rows.map((row) =>
    [
      opportunityName(row),
      row.title,
      row.platform ?? "",
      row.category ?? "",
      row.source ?? "",
      row.payoutCents == null ? "" : (row.payoutCents / 100).toFixed(2),
      row.minutes ?? "",
      row.hourly ?? "",
      row.score ?? "",
      row.notes ?? "",
      row.status,
    ]
      .map((value) => {
        const text = String(value);
        return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
      })
      .join(","),
  );
  const blob = new Blob([[sample ? "SAMPLE DATA\n" : "", header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sample ? "opportunities-sample.csv" : "opportunities.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function OpportunitiesBoard({
  rows,
  sample = false,
  error,
  yourApps = [],
}: {
  rows: OpportunityRecord[];
  sample?: boolean;
  error?: string;
  yourApps?: OwnerApp[];
}) {
  const [query, setQuery] = useState("");
  const [onlyYours, setOnlyYours] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("not-rejected");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [minHourly, setMinHourly] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("hourly");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => statusCounts(rows), [rows]);
  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value)))].sort(),
    [rows],
  );
  const sources = useMemo(
    () => [...new Set(rows.map((row) => row.source).filter((value): value is string => Boolean(value)))].sort(),
    [rows],
  );
  const minValue = minHourly.trim() === "" ? null : Number(minHourly);
  const appGroups = useMemo(() => {
    const names = [...new Set(yourApps.map((app) => app.category))].sort();
    return names.map((category) => ({
      category,
      apps: yourApps
        .filter((app) => app.category === category)
        .sort((a, b) => a.appName.localeCompare(b.appName)),
    }));
  }, [yourApps]);
  const matchedCount = useMemo(
    () => rows.filter((row) => row.status !== "rejected" && opportunityMatchesApp(row, yourApps)).length,
    [rows, yourApps],
  );
  const filtered = useMemo(
    () =>
      sortOpportunities(
        filterOpportunities(rows, {
          query,
          status,
          category,
          source,
          minHourly: minValue != null && Number.isFinite(minValue) ? minValue : null,
        }).filter((row) => !onlyYours || opportunityMatchesApp(row, yourApps)),
        sortKey,
        sortDirection,
      ),
    [rows, query, status, category, source, minValue, sortKey, sortDirection, onlyYours, yourApps],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const pageSample = sample && yourApps.length === 0;
  const feedSample = sample && yourApps.length > 0;
  const filtersDirty =
    query !== "" ||
    status !== "not-rejected" ||
    category !== "all" ||
    source !== "all" ||
    minHourly !== "" ||
    onlyYours;

  function toggleSort(key: SortKey) {
    setPage(0);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  }

  function resetFilters() {
    setQuery("");
    setStatus("not-rejected");
    setCategory("all");
    setSource("all");
    setMinHourly("");
    setOnlyYours(false);
    setSortKey("hourly");
    setSortDirection("desc");
    setPage(0);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {pageSample ? (
            <p className="mb-3 inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
              SAMPLE DATA. All numbers are mock. Not real offers or accounts.
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Opportunities</h1>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            Tasks that are not rejected, sorted by dollars per hour. You open each one yourself.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pageSample ? (
            <Button href="/opportunities" variant="secondary">
              Hide sample data
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => downloadCsv(filtered, sample)}>
            Export CSV
          </Button>
          <Button onClick={() => setAdding(true)}>Add lead manually</Button>
        </div>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const selectedFilter = filter.id === status;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={selectedFilter}
              onClick={() => {
                setStatus(filter.id);
                setPage(0);
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selectedFilter
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-secondary hover:text-foreground",
              )}
            >
              {filter.label}
              <span className="tabular-nums">{counts[filter.id]}</span>
            </button>
          );
        })}
      </div>

      {yourApps.length > 0 ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Your apps</h2>
              <p className="mt-1 text-sm text-secondary">
                {matchedCount === 0
                  ? "None of these match an opportunity yet."
                  : `${matchedCount} opportunities match an app you added.`}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={onlyYours}
              onClick={() => {
                setOnlyYours((current) => !current);
                setPage(0);
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                onlyYours
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-secondary hover:text-foreground",
              )}
            >
              Your apps
              <span className="tabular-nums">{matchedCount}</span>
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {appGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-medium text-secondary">{group.category}</h3>
                <p className="mt-1 text-sm text-foreground">{group.apps.map((app) => app.appName).join(", ")}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {feedSample || (yourApps.length > 0 && rows.length === 0) ? (
        <SampleNotice
          label="Opportunities feed: sample until Scout is connected"
          active={feedSample}
          previewHref={feedSample ? undefined : "/opportunities?sample=1"}
          hideHref={feedSample ? "/opportunities" : undefined}
        />
      ) : null}
      {feedSample ? (
        <p className="text-xs text-secondary">Sample rows are not your accounts.</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs text-secondary md:col-span-2 xl:col-span-1">
          Search
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search platform, title, or source"
            className={fieldClass}
          />
        </label>
        <label className="text-xs text-secondary">
          Type
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(0);
            }}
            className={fieldClass}
          >
            <option value="all">All</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-secondary">
          Source
          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(0);
            }}
            className={fieldClass}
          >
            <option value="all">All</option>
            {sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-secondary">
          Min $/hr
          <input
            value={minHourly}
            onChange={(event) => {
              setMinHourly(event.target.value);
              setPage(0);
            }}
            inputMode="decimal"
            placeholder="Any"
            className={fieldClass}
          />
        </label>
      </div>
      {filtersDirty ? (
        <div>
          <Button variant="ghost" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={onlyYours ? "No opportunities match your apps" : "No matching opportunities"}
          description={
            onlyYours
              ? "None of these rows use an app name from My accounts."
              : "Nothing matches these filters. Rejected tasks stay hidden while Not rejected is selected."
          }
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <Table fluid>
            <TableHeader>
              <tr>
                <TableHead sorted={sortKey === "name" ? sortDirection : "none"}>
                  <SortButton
                    label="Platform"
                    active={sortKey === "name"}
                    direction={sortDirection}
                    onSort={() => toggleSort("name")}
                  />
                </TableHead>
                <TableHead sorted={sortKey === "category" ? sortDirection : "none"} className="hidden md:table-cell">
                  <SortButton
                    label="Type"
                    active={sortKey === "category"}
                    direction={sortDirection}
                    onSort={() => toggleSort("category")}
                  />
                </TableHead>
                <TableHead sorted={sortKey === "source" ? sortDirection : "none"} className="hidden lg:table-cell">
                  <SortButton
                    label="Source"
                    active={sortKey === "source"}
                    direction={sortDirection}
                    onSort={() => toggleSort("source")}
                  />
                </TableHead>
                <TableHead sorted={sortKey === "payout" ? sortDirection : "none"} className="hidden sm:table-cell">
                  <SortButton
                    label="Est. value"
                    active={sortKey === "payout"}
                    direction={sortDirection}
                    onSort={() => toggleSort("payout")}
                  />
                </TableHead>
                <TableHead sorted={sortKey === "minutes" ? sortDirection : "none"} className="hidden md:table-cell">
                  <SortButton
                    label="Minutes"
                    active={sortKey === "minutes"}
                    direction={sortDirection}
                    onSort={() => toggleSort("minutes")}
                  />
                </TableHead>
                <TableHead sorted={sortKey === "hourly" ? sortDirection : "none"}>
                  <SortButton
                    label="$/hr"
                    active={sortKey === "hourly"}
                    direction={sortDirection}
                    onSort={() => toggleSort("hourly")}
                  />
                </TableHead>
                <TableHead sorted={sortKey === "score" ? sortDirection : "none"} className="hidden sm:table-cell">
                  <SortButton
                    label="Vetter score"
                    active={sortKey === "score"}
                    direction={sortDirection}
                    onSort={() => toggleSort("score")}
                  />
                </TableHead>
                <TableHead sorted="none" className="hidden xl:table-cell">
                  <span className="px-1 text-xs font-medium">Requirements</span>
                </TableHead>
                <TableHead sorted={sortKey === "status" ? sortDirection : "none"}>
                  <SortButton
                    label="Status"
                    active={sortKey === "status"}
                    direction={sortDirection}
                    onSort={() => toggleSort("status")}
                  />
                </TableHead>
                <TableHead sorted="none">
                  <span className="sr-only">Details</span>
                </TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id} onClick={() => setSelectedId(row.id)}>
                  <TableCell>
                    <span className="block font-medium">{opportunityName(row)}</span>
                    <span className="block text-xs text-secondary">{row.title}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.category ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{row.source ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">{money(row.payoutCents)}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">
                    {row.minutes ?? "—"}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{hourlyLabel(row.hourly)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {row.score == null ? "—" : <ScoreBadge score={row.score} />}
                  </TableCell>
                  <TableCell className="hidden max-w-48 truncate xl:table-cell text-secondary">
                    {row.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={row.status} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Details
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-3 text-xs text-secondary">
            <p>
              Showing {visible.length} of {filtered.length}
              {sample ? " · sample data" : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Drawer
        open={selected != null}
        title={selected ? opportunityName(selected) : "Opportunity"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-secondary">Title</dt>
              <dd className="mt-1 text-foreground">{selected.title}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Status</dt>
              <dd className="mt-1">
                <StatusPill status={selected.status} />
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-secondary">Est. value</dt>
                <dd className="mt-1 tabular-nums">{money(selected.payoutCents)}</dd>
              </div>
              <div>
                <dt className="text-xs text-secondary">$/hr</dt>
                <dd className="mt-1 font-semibold tabular-nums">{hourlyLabel(selected.hourly)}</dd>
              </div>
              <div>
                <dt className="text-xs text-secondary">Minutes</dt>
                <dd className="mt-1 tabular-nums">{selected.minutes ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-secondary">Vetter score</dt>
                <dd className="mt-1">
                  {selected.score == null ? "—" : <ScoreBadge score={selected.score} />}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-secondary">Source</dt>
              <dd className="mt-1">{selected.source ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Requirements</dt>
              <dd className="mt-1 text-secondary">{selected.notes ?? "—"}</dd>
            </div>
            {selected.url ? (
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Open this task yourself
              </a>
            ) : null}
          </dl>
        ) : null}
      </Drawer>

      <Drawer open={adding} title="Add lead manually" onClose={() => setAdding(false)}>
        {sample ? (
          <p className="text-sm text-secondary">
            This preview is sample data and is not saved. Hide sample data to add a lead to your account.
          </p>
        ) : (
          <form action={createOpportunity} className="space-y-3">
            <label className="block text-xs text-secondary">
              Title
              <input name="title" required className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              App
              <input name="app" className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Platform
              <input name="platform" className={fieldClass} placeholder="ios, android, or web" />
            </label>
            <label className="block text-xs text-secondary">
              Source
              <input name="source" className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Type
              <input name="category" className={fieldClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-secondary">
                Est. value (USD)
                <input name="payout" inputMode="decimal" min="0" step="0.01" className={fieldClass} />
              </label>
              <label className="block text-xs text-secondary">
                Minutes
                <input name="minutes" inputMode="numeric" min="1" step="1" className={fieldClass} />
              </label>
            </div>
            <label className="block text-xs text-secondary">
              Vetter score
              <input name="score" inputMode="numeric" min="0" max="100" className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Link
              <input name="url" type="url" placeholder="https://example.com/task" className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Requirements
              <textarea name="notes" rows={3} className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Status
              <select name="status" defaultValue="new" className={fieldClass}>
                <option value="new">New</option>
                <option value="vetted">Vetted</option>
                <option value="queued">Queued</option>
                <option value="claimed">Claimed</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <Button type="submit">Save lead</Button>
          </form>
        )}
      </Drawer>
    </div>
  );
}
