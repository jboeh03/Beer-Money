import { Bell } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/shell/account-menu";
import { NAV_ITEMS, type NavItem } from "@/components/shell/nav";
import { cn } from "@/lib/cn";

type AppShellProps = {
  activeHref: string;
  children: ReactNode;
  items?: readonly NavItem[];
  counts?: Partial<Record<string, number>>;
  homeHref?: string;
};

function NavLinks({
  items,
  activeHref,
  counts,
  compact,
}: {
  items: readonly NavItem[];
  activeHref: string;
  counts?: Partial<Record<string, number>>;
  compact?: boolean;
}) {
  return items.map((item) => {
    const active = item.href === activeHref;
    const Icon = item.icon;
    const count = counts?.[item.id];

    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          compact ? "min-w-0 flex-1 flex-col justify-center gap-1 px-1 text-center leading-tight" : "justify-between",
          active
            ? "bg-accent text-accent-foreground"
            : "text-secondary hover:bg-muted hover:text-foreground",
        )}
      >
        <span className={cn("flex min-w-0 items-center gap-2", compact && "flex-col gap-1")}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className={compact ? "max-w-full" : undefined}>{item.label}</span>
        </span>
        {typeof count === "number" && !compact ? (
          <span className={cn("tabular-nums", active ? "text-accent-foreground" : "text-secondary")}>
            {count}
          </span>
        ) : null}
      </Link>
    );
  });
}

function NotificationsLink({ active, compact }: { active: boolean; compact?: boolean }) {
  return (
    <Link
      href="/settings/notifications"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg text-xs font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        compact ? "min-w-11 justify-center px-2" : "px-3 py-2",
        active
          ? "bg-accent text-accent-foreground"
          : "text-secondary hover:bg-muted hover:text-foreground",
      )}
    >
      <Bell className="size-4 shrink-0" aria-hidden="true" />
      {compact ? <span className="sr-only">Notifications</span> : <span>Notifications</span>}
    </Link>
  );
}

function Brand({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="grid size-9 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
        BM
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">Beer Money</span>
        <span className="block text-xs text-secondary">Daily rewards engine</span>
      </span>
    </Link>
  );
}

export function AppShell({
  activeHref,
  children,
  items = NAV_ITEMS,
  counts,
  homeHref = "/today",
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <aside className="hidden border-r border-border md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-6 md:p-4">
        <Brand href={homeHref} />
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          <NavLinks items={items} activeHref={activeHref} counts={counts} />
        </nav>
        <div className="mt-auto">
          <NotificationsLink active={activeHref === "/settings/notifications"} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:justify-end">
          <div className="md:hidden">
            <Brand href={homeHref} />
          </div>
          <div className="flex items-center gap-1">
            <div className="md:hidden">
              <NotificationsLink active={activeHref === "/settings/notifications"} compact />
            </div>
            <AccountMenu />
          </div>
        </header>
        <main id="content" className="min-w-0 flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-1 py-1 md:hidden"
      >
        <div className="flex items-stretch gap-1">
          <NavLinks items={items} activeHref={activeHref} compact />
        </div>
      </nav>
    </div>
  );
}
