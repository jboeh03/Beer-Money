export function PriorityBadge({ value }: { value: number | string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-secondary tabular-nums">
      <span className="sr-only">Priority </span>
      {value}
    </span>
  );
}
