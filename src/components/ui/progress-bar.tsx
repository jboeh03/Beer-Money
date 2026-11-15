import { useId } from "react";

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const labelId = useId();
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div>
      <div id={labelId} className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-secondary">{label}</span>
        <span className="text-foreground tabular-nums">
          {clamped} of {safeMax}
        </span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-foreground" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
