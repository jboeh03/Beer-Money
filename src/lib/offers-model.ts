import type { RewardStatus } from "@/lib/database.types";
import { safeHttpUrl } from "@/lib/today-model";

export type OfferRecord = {
  id: string;
  title: string;
  app: string | null;
  platform: string | null;
  payoutCents: number | null;
  minutes: number | null;
  hourly: number | null;
  notes: string | null;
  url: string | null;
  status: RewardStatus;
};

export function offerName(offer: OfferRecord) {
  return offer.app?.trim() || offer.title.trim();
}

export function compareOffers(
  offers: readonly OfferRecord[],
  filters: { query: string; platform: string },
) {
  const query = filters.query.trim().toLowerCase();
  const platform = filters.platform.trim().toLowerCase();

  return offers
    .filter((offer) => offer.status !== "rejected")
    .filter((offer) => {
      if (platform && platform !== "all" && (offer.platform ?? "").toLowerCase() !== platform) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [offer.title, offer.app, offer.platform, offer.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => (b.payoutCents ?? -1) - (a.payoutCents ?? -1));
}

export function winnerGap(offers: readonly OfferRecord[]) {
  const ranked = [...offers].sort((a, b) => (b.payoutCents ?? -1) - (a.payoutCents ?? -1));
  const winner = ranked[0];
  const next = ranked[1];
  if (!winner || winner.payoutCents == null) {
    return null;
  }
  const gap =
    next?.payoutCents == null ? null : winner.payoutCents - next.payoutCents;
  return { winner, next: next ?? null, gapCents: gap };
}

export function offerUrl(value: string | null) {
  return safeHttpUrl(value);
}
