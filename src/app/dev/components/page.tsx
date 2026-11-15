import { ComponentGallery } from "@/app/dev/components/gallery";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ITEMS } from "@/components/shell/nav";

const SAMPLE_COUNTS = {
  today: 4,
  opportunities: 6,
  "best-offer-matcher": 3,
  "referral-hub": 2,
  "content-studio": 5,
};

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ nav?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.nav) ? params.nav[0] : params.nav;
  const activeId = NAV_ITEMS.some((item) => item.id === requested) ? requested : "today";
  const items = NAV_ITEMS.map((item) => ({
    ...item,
    href: `/dev/components?nav=${item.id}`,
  }));

  return (
    <AppShell
      activeHref={`/dev/components?nav=${activeId}`}
      homeHref="/dev/components"
      items={items}
      counts={SAMPLE_COUNTS}
    >
      <ComponentGallery />
    </AppShell>
  );
}
