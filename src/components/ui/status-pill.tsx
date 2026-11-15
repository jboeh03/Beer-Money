import {
  BadgeCheck,
  Banknote,
  Clock,
  Hand,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { RewardStatus } from "@/lib/database.types";
import { cn } from "@/lib/cn";

const STATUSES: Record<
  RewardStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  new: {
    label: "New",
    icon: Sparkles,
    className: "bg-status-new/15 text-status-new",
  },
  vetted: {
    label: "Vetted",
    icon: BadgeCheck,
    className: "bg-status-vetted/15 text-status-vetted",
  },
  queued: {
    label: "Queued",
    icon: Clock,
    className: "bg-status-queued/15 text-status-queued",
  },
  claimed: {
    label: "Claimed",
    icon: Hand,
    className: "bg-status-claimed/15 text-status-claimed",
  },
  paid: {
    label: "Paid",
    icon: Banknote,
    className: "bg-status-paid/15 text-status-paid",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-status-rejected/15 text-status-rejected",
  },
};

export function StatusPill({ status }: { status: RewardStatus }) {
  const item = STATUSES[status];
  const Icon = item.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        item.className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {item.label}
    </span>
  );
}
