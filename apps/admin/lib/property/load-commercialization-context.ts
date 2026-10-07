import { getPropertyDetailContext } from "@/lib/api/property-detail-context";
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
  const [base, { operations }] = await Promise.all([
    loadPropertyPublishabilityContext(propertyId),
    getPropertyDetailContext(propertyId),
  ]);
  const priceEntries = operations.map(({ listing, prices }) => [
    listing.id,
    prices,
  ]);

  return {
    ...base,
    pricesByListingId: Object.fromEntries(priceEntries),
  };
}
