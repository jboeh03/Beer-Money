"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SortDirection = "asc" | "desc";

export function Table({ children, fluid = false }: { children: ReactNode; fluid?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table
        className={cn(
          "w-full border-collapse text-left text-sm",
          !fluid && "min-w-[40rem]",
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-muted text-xs text-secondary">{children}</thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-t border-border transition-colors hover:bg-muted/80 focus-within:bg-muted",
        onClick && "cursor-pointer",
      )}
    >
      {children}
    </tr>
  );
}

const ariaSort = {
  asc: "ascending",
  desc: "descending",
  none: "none",
} as const;

export function TableHead({
  children,
  sorted = "none",
  className,
}: {
  children: ReactNode;
  sorted?: SortDirection | "none";
  className?: string;
}) {
  return (
    <th scope="col" aria-sort={ariaSort[sorted]} className={cn("px-3 py-3 font-medium", className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-3 text-foreground", className)}>{children}</td>;
}

export function SortButton({
  label,
  active,
  direction,
  onSort,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
}) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={onSort}
      className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-xs font-medium text-secondary outline-none hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {label}
      <Icon className={cn("size-3.5", active ? "text-foreground" : "text-secondary")} aria-hidden="true" />
      <span className="sr-only">
        {active
          ? direction === "asc"
            ? ", sorted ascending. Activate to sort descending."
            : ", sorted descending. Activate to sort ascending."
          : ", not sorted. Activate to sort descending."}
      </span>
    </button>
  );
}

export function useColumnSort<T extends object>(
  rows: readonly T[],
  initialKey: keyof T & string,
  initialDirection: SortDirection = "desc",
) {
  const [sort, setSort] = useState<{ key: keyof T & string; direction: SortDirection }>({
    key: initialKey,
    direction: initialDirection,
  });

  const sorted = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return sort.direction === "asc" ? result : -result;
    });
    return next;
  }, [rows, sort]);

  function toggle(key: keyof T & string) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  return { sorted, sort, toggle };
}
