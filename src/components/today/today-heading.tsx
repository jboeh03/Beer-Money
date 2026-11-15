"use client";

export function TodayHeading({ name, summary }: { name: string; summary: string }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div>
      <h1
        className="text-3xl font-semibold tracking-tight text-foreground"
        suppressHydrationWarning
      >
        {greeting}, {name}
      </h1>
      <p className="mt-2 text-sm text-secondary" suppressHydrationWarning>
        {date}. {summary}
      </p>
    </div>
  );
}
