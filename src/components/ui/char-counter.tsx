import { cn } from "@/lib/cn";

export function CharCounter({
  value,
  max,
  label = "Characters",
}: {
  value: string;
  max: number;
  label?: string;
}) {
  const count = value.length;
  const over = count > max;

  return (
    <p className={cn("text-xs", over ? "text-negative" : "text-secondary")} aria-live="polite">
      {label}: <span className="tabular-nums">{count}</span> / {max}
      {over ? " over the limit" : ""}
    </p>
  );
}
