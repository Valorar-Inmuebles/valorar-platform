import { getPropertyDetailContext } from "@/lib/api/property-detail-context";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import { loadPropertyPublishabilityContext } from "@/lib/property/load-publishability-context";

export type CommercializationContext = Awaited<
  ReturnType<typeof loadPropertyPublishabilityContext>
> & {
  pricesByListingId: Record<string, AdminPropertyPrice[]>;
  canEdit: boolean;
  imageCount: number;
  hasCoverImage: boolean;
};

export async function loadCommercializationContext(
  propertyId: string,
): Promise<CommercializationContext> {
  const [base, { operations, canEdit, imageCount, hasCoverImage }] =
    await Promise.all([
      loadPropertyPublishabilityContext(propertyId),
      getPropertyDetailContext(propertyId),
    ]);
  const priceEntries = operations.map(({ listing, prices }) => [
    listing.id,
    prices,
  ]);

  return {
    ...base,
    canEdit,
    imageCount,
    hasCoverImage,
    pricesByListingId: Object.fromEntries(priceEntries),
  };
}
