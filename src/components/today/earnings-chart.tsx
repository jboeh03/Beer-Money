import { formatUsd, type ChartSegment, type TodayView } from "@/lib/today-model";

const SERIES = [
  "var(--status-queued)",
  "var(--status-new)",
  "var(--positive)",
  "var(--status-vetted)",
  "var(--secondary)",
];

function seriesColor(index: number) {
  return SERIES[index] ?? SERIES[SERIES.length - 1];
}

export function EarningsChart({ chart }: { chart: TodayView["chart"] }) {
  const max = Math.max(
    1,
    ...chart.days.map((day) => day.segments.reduce((total, segment) => total + segment.cents, 0)),
  );
  const total = chart.legend.reduce((sum, item) => sum + item.cents, 0);

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">Earnings snapshot</span>
        <span className="text-xs text-secondary">Last 7 days</span>
      </figcaption>
      {total === 0 ? (
        <p className="mt-4 text-sm text-secondary">No paid earnings in the last 7 days.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div
            className="flex h-40 flex-1 items-end gap-2"
            role="img"
            aria-label={chart.legend
              .map((item) => `${item.category} ${formatUsd(item.cents)}`)
              .join(", ")}
          >
            {chart.days.map((day) => {
              const dayTotal = day.segments.reduce((sum, segment) => sum + segment.cents, 0);
              const height = dayTotal === 0 ? 0 : Math.max(8, (dayTotal / max) * 100);

              return (
                <div key={day.iso} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end">
                    <div
                      className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
                      style={{ height: `${height}%` }}
                    >
                      {day.segments.map((segment) => (
                        <div
                          key={segment.category}
                          className="w-full min-h-0.5"
                          style={{
                            flexGrow: segment.cents,
                            background: seriesColor(segment.colorIndex),
                          }}
                          title={`${day.label}: ${segment.category} ${formatUsd(segment.cents)}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span
                    className={
                      day.isToday
                        ? "text-xs font-medium text-foreground"
                        : "text-xs text-secondary"
                    }
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <ul className="space-y-2 md:w-48">
            {chart.legend.map((item: ChartSegment) => (
              <li key={item.category} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-secondary">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: seriesColor(item.colorIndex) }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.category}</span>
                </span>
                <span className="text-foreground tabular-nums">{formatUsd(item.cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
