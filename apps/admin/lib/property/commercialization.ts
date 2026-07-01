import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import { formatPrice } from "@/lib/format/price";

export type ListingPriceSummary = {
  primary: AdminPropertyPrice | null;
  secondary: AdminPropertyPrice[];
  count: number;
};

export function summarizeListingPrices(
  prices: AdminPropertyPrice[],
): ListingPriceSummary {
  const primary = prices.find((price) => price.isPrimary) ?? null;
  const secondary = prices.filter((price) => !price.isPrimary);

  return {
    primary,
    secondary,
    count: prices.length,
  };
}

export function formatOtherPrices(prices: AdminPropertyPrice[]): string {
  const { secondary } = summarizeListingPrices(prices);

  if (secondary.length === 0) {
    return "—";
  }

  return secondary
    .map((price) => formatPrice(price.amount, price.currency))
    .join(" · ");
}
