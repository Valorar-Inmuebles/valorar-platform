import { listPropertyPrices } from "@/lib/api/property-price";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import { loadPropertyPublishabilityContext } from "@/lib/property/load-publishability-context";

export type CommercializationContext = Awaited<
  ReturnType<typeof loadPropertyPublishabilityContext>
> & {
  pricesByListingId: Record<string, AdminPropertyPrice[]>;
};

export async function loadCommercializationContext(
  propertyId: string,
): Promise<CommercializationContext> {
  const base = await loadPropertyPublishabilityContext(propertyId);

  const priceEntries = await Promise.all(
    base.listings.map(async (listing) => {
      const prices = await listPropertyPrices(listing.id);
      return [listing.id, prices] as const;
    }),
  );

  return {
    ...base,
    pricesByListingId: Object.fromEntries(priceEntries),
  };
}
