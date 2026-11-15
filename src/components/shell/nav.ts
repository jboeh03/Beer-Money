import {
  Clapperboard,
  ListChecks,
  Scale,
  Share2,
  Sun,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "today", href: "/today", label: "Today", icon: Sun },
  { id: "opportunities", href: "/opportunities", label: "Opportunities", icon: ListChecks },
  {
    id: "best-offer-matcher",
    href: "/best-offer-matcher",
    label: "Best-offer matcher",
    icon: Scale,
  },
  { id: "referral-hub", href: "/referral-hub", label: "Referral hub", icon: Share2 },
  {
    id: "content-studio",
    href: "/content-studio",
    label: "Content studio",
    icon: Clapperboard,
  },
];
