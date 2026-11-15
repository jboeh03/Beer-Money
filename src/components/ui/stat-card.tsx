import { Card } from "@/components/ui/card";

type Delta = {
  direction: "up" | "down" | "flat";
  label: string;
};

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  delta?: Delta;
};

const deltaClass = {
  up: "text-positive",
  down: "text-negative",
  flat: "text-secondary",
};

export function StatCard({ label, value, detail, delta }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs text-secondary">{detail}</p> : null}
      {delta ? (
        <p className={`mt-2 text-xs ${deltaClass[delta.direction]}`}>{delta.label}</p>
      ) : null}
    </Card>
  );
}
