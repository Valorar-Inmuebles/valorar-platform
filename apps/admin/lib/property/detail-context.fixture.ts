import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";

// Anonymized shape of the read-only baseline: 1 listing, 33 images, 5 features.
export const detailProperty: AdminProperty = {
  id: "property-1",
  tenantId: "tenant-1",
  createdById: "user-1",
  assignedToId: null,
  slug: "baseline-property",
  title: "Baseline Property",
  description:
    "A sufficiently long property description for the existing SEO indicator.",
  internalCode: null,
  propertyType: "HOUSE",
  condition: null,
  isActive: true,
  street: "Street",
  streetNumber: "100",
  floor: null,
  apartment: null,
  neighborhood: null,
  city: "City",
  province: "Province",
  state: "Province",
  country: "AR",
  countryId: null,
  provinceId: null,
  localityId: null,
  neighborhoodId: null,
  provinceName: null,
  localityName: null,
  neighborhoodName: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  totalArea: null,
  coveredArea: null,
  uncoveredArea: null,
  lotFront: null,
  lotDepth: null,
  rooms: null,
  bedrooms: null,
  bathrooms: null,
  halfBathrooms: null,
  parkingSpaces: null,
  yearBuilt: null,
  orientation: null,
  layout: null,
  brightness: null,
  listingTypes: ["SALE"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const detailListings: AdminPropertyListing[] = [
  {
    id: "listing-1",
    tenantId: "tenant-1",
    propertyId: detailProperty.id,
    listingType: "SALE",
    status: "ACTIVE",
    expensesAmount: null,
    expensesCurrency: null,
    isFeatured: true,
    publishedAt: detailProperty.createdAt,
    closedAt: null,
    createdAt: detailProperty.createdAt,
    updatedAt: detailProperty.updatedAt,
  },
];

export const detailPrices: AdminPropertyPrice[] = [
  {
    id: "price-1",
    tenantId: "tenant-1",
    listingId: "listing-1",
    amount: 100000,
    currency: "USD",
    isPrimary: true,
    label: null,
    createdAt: detailProperty.createdAt,
    updatedAt: detailProperty.updatedAt,
  },
];

export const detailImages = Array.from({ length: 33 }, (_, i) => ({
  id: `image-${i}`,
  propertyId: detailProperty.id,
  tenantId: "tenant-1",
  isCover: i === 0,
}));
export const detailFeatures = Array.from({ length: 5 }, (_, i) => ({
  featureId: `feature-${i}`,
  slug: `feature-${i}`,
  name: `Feature ${i}`,
  category: "GENERAL",
  value: null,
}));
