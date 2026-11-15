"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";

const itemClass =
  "flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm text-foreground outline-none hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function AccountMenuButton({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = email?.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="grid size-11 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <span aria-hidden="true">{initial}</span>
        <span className="sr-only">Account menu{email ? ` for ${email}` : ""}</span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-lg"
        >
          {email ? (
            <p className="truncate px-3 py-2 text-xs text-secondary" title={email}>
              {email}
            </p>
          ) : null}
          <Link role="menuitem" href="/settings" className={itemClass} onClick={() => setOpen(false)}>
            Settings
          </Link>
          <Link
            role="menuitem"
            href="/settings/api-keys"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            API keys
          </Link>
          <Link
            role="menuitem"
            href="/settings/integrations"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            Integrations
          </Link>
          <Link role="menuitem" href="/accounts" className={itemClass} onClick={() => setOpen(false)}>
            My accounts
          </Link>
          <Link role="menuitem" href="/explore" className={itemClass} onClick={() => setOpen(false)}>
            Explore
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem" className={itemClass}>
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
