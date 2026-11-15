import { ComingSoon } from "@/components/shell/coming-soon";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications · Beer Money" };

export default function NotificationsPlaceholderPage() {
  return <ComingSoon title="Notifications" href="/settings/notifications" />;
}
