import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  children: ReactNode;
};

export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-card p-5",
        interactive &&
          "transition-colors hover:border-foreground/30 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
