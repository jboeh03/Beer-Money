import { Button } from "@/components/ui/button";

export function SampleNotice({
  label,
  previewHref,
  hideHref,
  active = false,
}: {
  label: string;
  previewHref?: string;
  hideHref?: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-secondary">
        {active ? `SAMPLE DATA. ${label}` : label}
      </p>
      {active && hideHref ? (
        <Button href={hideHref} variant="secondary">
          Hide sample data
        </Button>
      ) : previewHref ? (
        <Button href={previewHref} variant="secondary">
          Preview with sample data
        </Button>
      ) : null}
    </div>
  );
}
