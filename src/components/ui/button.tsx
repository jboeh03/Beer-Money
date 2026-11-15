import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  loading?: boolean;
  children: ReactNode;
};

const variants = {
  primary:
    "bg-accent text-accent-foreground hover:brightness-110 focus-visible:outline-foreground",
  secondary:
    "border border-border bg-transparent text-foreground hover:bg-muted focus-visible:outline-accent",
  ghost:
    "bg-transparent text-foreground hover:bg-muted focus-visible:outline-accent",
};

const sizes = {
  md: "min-h-11 px-4 text-sm",
  sm: "min-h-9 px-3 text-xs",
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const unavailable = disabled || loading;
  const classes = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if (href && !unavailable) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={unavailable}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="inline-flex animate-spin" aria-hidden="true">
            <Loader2 className="size-4" />
          </span>
          Loading
        </>
      ) : (
        children
      )}
    </button>
  );
}
