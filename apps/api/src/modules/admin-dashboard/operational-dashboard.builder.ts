import { evaluateListingPublishability } from '@repo/property-rules';
import type {
  Property,
  PropertyImage,
  PropertyListing,
  PropertyListingType,
} from '../../../generated/prisma/client';

const DESCRIPTION_MIN_LENGTH = 40;
const RECENTLY_ARCHIVED_DAYS = 30;
const ACTIVITY_WINDOW_DAYS = 90;
const ACTIVITY_LIMIT = 12;
const UPDATE_THRESHOLD_MS = 60_000;

export type PropertyWithCreator = Property & {
  createdBy: { id: string; name: string };
};

export type DashboardActivityType =
  | 'property_created'
  | 'property_updated'
  | 'listing_published'
  | 'listing_created'
  | 'images_added'
  | 'property_archived';

export type DashboardActivityItem = {
  id: string;
  type: DashboardActivityType;
  timestamp: Date;
  propertyId: string;
  propertyTitle: string;
  actorName: string | null;
  label: string;
  detail: string | null;
};

export type OperationalDashboardResult = {
  kpis: {
    totalProperties: number;
    published: number;
    drafts: number;
    archived: number;
  };
  catalogHealth: {
    withoutImages: number;
    withoutCommercialization: number;
    withoutDescription: number;
    withoutFeatures: number;
    pendingPublication: number;
  };
  attentionAlerts: {
    withoutImages: number;
    withoutPrice: number;
    withoutDescription: number;
    withoutCommercialization: number;
    recentlyArchived: number;
  };
  filterSets: {
    withoutImages: string[];
    withoutCommercialization: string[];
    withoutDescription: string[];
    withoutFeatures: string[];
    pendingPublication: string[];
    withoutPrice: string[];
    recentlyArchived: string[];
  };
  recentActivity: DashboardActivityItem[];
};

type BuildOperationalDashboardInput = {
  properties: PropertyWithCreator[];
  listings: PropertyListing[];
  imageStats: Map<string, { imageCount: number; hasCoverImage: boolean }>;
  images: PropertyImage[];
  featureCounts: Map<string, number>;
  primaryPriceListingIds: Set<string>;
  now?: Date;
};

const LISTING_TYPE_LABELS: Record<PropertyListingType, string> = {
  SALE: 'Venta',
  RENT: 'Alquiler',
  TEMPORARY_RENT: 'Temporario',
};

function hasDescription(property: Property): boolean {
  return (property.description?.trim().length ?? 0) >= DESCRIPTION_MIN_LENGTH;
}

function isRecentlyArchived(property: Property, now: Date): boolean {
  if (property.isActive) {
    return false;
  }

  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - RECENTLY_ARCHIVED_DAYS);

  return property.updatedAt >= threshold;
}

function isWithinActivityWindow(date: Date, now: Date): boolean {
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - ACTIVITY_WINDOW_DAYS);

  return date >= threshold;
}

function buildRecentActivity(
  input: BuildOperationalDashboardInput,
  listingsByPropertyId: Map<string, PropertyListing[]>,
  propertyById: Map<string, PropertyWithCreator>,
  now: Date,
): DashboardActivityItem[] {
  const events: DashboardActivityItem[] = [];

  for (const property of input.properties) {
    if (isWithinActivityWindow(property.createdAt, now)) {
      events.push({
        id: `property-created-${property.id}`,
        type: 'property_created',
        timestamp: property.createdAt,
        propertyId: property.id,
        propertyTitle: property.title,
        actorName: property.createdBy.name,
        label: 'Nueva propiedad',
        detail: null,
      });
    }

    const updatedAfterCreate =
      property.updatedAt.getTime() - property.createdAt.getTime() >
      UPDATE_THRESHOLD_MS;

    if (
      updatedAfterCreate &&
      isWithinActivityWindow(property.updatedAt, now) &&
      property.isActive
    ) {
      events.push({
        id: `property-updated-${property.id}-${property.updatedAt.toISOString()}`,
        type: 'property_updated',
        timestamp: property.updatedAt,
        propertyId: property.id,
        propertyTitle: property.title,
        actorName: property.createdBy.name,
        label: 'Propiedad actualizada',
        detail: null,
      });
    }

    if (isRecentlyArchived(property, now)) {
      events.push({
        id: `property-archived-${property.id}`,
        type: 'property_archived',
        timestamp: property.updatedAt,
        propertyId: property.id,
        propertyTitle: property.title,
        actorName: null,
        label: 'Propiedad archivada',
        detail: null,
      });
    }
  }

  for (const listing of input.listings) {
    const property = propertyById.get(listing.propertyId);

    if (!property) {
      continue;
    }

    if (
      listing.status === 'ACTIVE' &&
      listing.publishedAt &&
      isWithinActivityWindow(listing.publishedAt, now)
    ) {
      events.push({
        id: `listing-published-${listing.id}-${listing.publishedAt.toISOString()}`,
        type: 'listing_published',
        timestamp: listing.publishedAt,
        propertyId: listing.propertyId,
        propertyTitle: property.title,
        actorName: property.createdBy.name,
        label: 'Operación publicada',
        detail: LISTING_TYPE_LABELS[listing.listingType],
      });
      continue;
    }

    if (isWithinActivityWindow(listing.createdAt, now)) {
      events.push({
        id: `listing-created-${listing.id}`,
        type: 'listing_created',
        timestamp: listing.createdAt,
        propertyId: listing.propertyId,
        propertyTitle: property.title,
        actorName: property.createdBy.name,
        label: 'Nueva operación comercial',
        detail: LISTING_TYPE_LABELS[listing.listingType],
      });
    }
  }

  const latestImageByProperty = new Map<string, PropertyImage>();

  for (const image of input.images) {
    const current = latestImageByProperty.get(image.propertyId);

    if (!current || image.createdAt > current.createdAt) {
      latestImageByProperty.set(image.propertyId, image);
    }
  }

  for (const [propertyId, image] of latestImageByProperty) {
    if (!isWithinActivityWindow(image.createdAt, now)) {
      continue;
    }

    const property = propertyById.get(propertyId);

    if (!property) {
      continue;
    }

    const stats = input.imageStats.get(propertyId);

    events.push({
      id: `images-added-${propertyId}-${image.createdAt.toISOString()}`,
      type: 'images_added',
      timestamp: image.createdAt,
      propertyId,
      propertyTitle: property.title,
      actorName: null,
      label: 'Se agregaron imágenes',
      detail:
        stats && stats.imageCount > 1
          ? `${stats.imageCount} imágenes`
          : null,
    });
  }

  events.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());

  const seen = new Set<string>();
  const unique: DashboardActivityItem[] = [];

  for (const event of events) {
    const key = `${event.type}:${event.propertyId}:${event.timestamp.toISOString()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(event);

    if (unique.length >= ACTIVITY_LIMIT) {
      break;
    }
  }

  return unique;
}

export function buildOperationalDashboard(
  input: BuildOperationalDashboardInput,
): OperationalDashboardResult {
  const now = input.now ?? new Date();

  const filterSets = {
    withoutImages: [] as string[],
    withoutCommercialization: [] as string[],
    withoutDescription: [] as string[],
    withoutFeatures: [] as string[],
    pendingPublication: [] as string[],
    withoutPrice: [] as string[],
    recentlyArchived: [] as string[],
  };

  let published = 0;
  let drafts = 0;
  let archived = 0;

  const listingsByPropertyId = new Map<string, PropertyListing[]>();

  for (const listing of input.listings) {
    const group = listingsByPropertyId.get(listing.propertyId) ?? [];
    group.push(listing);
    listingsByPropertyId.set(listing.propertyId, group);
  }

  const propertyById = new Map(
    input.properties.map((property) => [property.id, property]),
  );

  for (const property of input.properties) {
    const stats = input.imageStats.get(property.id) ?? {
      imageCount: 0,
      hasCoverImage: false,
    };
    const propertyListings = listingsByPropertyId.get(property.id) ?? [];
    const featureCount = input.featureCounts.get(property.id) ?? 0;

    if (!property.isActive) {
      archived += 1;

      if (isRecentlyArchived(property, now)) {
        filterSets.recentlyArchived.push(property.id);
      }

      continue;
    }

    let isAnyPublishable = false;
    let hasListing = propertyListings.length > 0;
    let hasActiveListingWithoutPrice = false;

    for (const listing of propertyListings) {
      const result = evaluateListingPublishability({
        propertyIsActive: property.isActive,
        imageCount: stats.imageCount,
        hasCoverImage: stats.hasCoverImage,
        listingStatus: listing.status,
        hasPrimaryPrice: input.primaryPriceListingIds.has(listing.id),
      });

      if (result.isPublishable) {
        isAnyPublishable = true;
      }

      if (
        listing.status === 'ACTIVE' &&
        !input.primaryPriceListingIds.has(listing.id)
      ) {
        hasActiveListingWithoutPrice = true;
      }
    }

    if (isAnyPublishable) {
      published += 1;
    } else {
      drafts += 1;
    }

    if (stats.imageCount === 0) {
      filterSets.withoutImages.push(property.id);
    }

    if (!hasListing) {
      filterSets.withoutCommercialization.push(property.id);
    }

    if (!hasDescription(property)) {
      filterSets.withoutDescription.push(property.id);
    }

    if (featureCount === 0) {
      filterSets.withoutFeatures.push(property.id);
    }

    if (hasListing && !isAnyPublishable) {
      filterSets.pendingPublication.push(property.id);
    }

    if (hasActiveListingWithoutPrice) {
      filterSets.withoutPrice.push(property.id);
    }
  }

  const recentActivity = buildRecentActivity(
    input,
    listingsByPropertyId,
    propertyById,
    now,
  );

  return {
    kpis: {
      totalProperties: input.properties.length,
      published,
      drafts,
      archived,
    },
    catalogHealth: {
      withoutImages: filterSets.withoutImages.length,
      withoutCommercialization: filterSets.withoutCommercialization.length,
      withoutDescription: filterSets.withoutDescription.length,
      withoutFeatures: filterSets.withoutFeatures.length,
      pendingPublication: filterSets.pendingPublication.length,
    },
    attentionAlerts: {
      withoutImages: filterSets.withoutImages.length,
      withoutPrice: filterSets.withoutPrice.length,
      withoutDescription: filterSets.withoutDescription.length,
      withoutCommercialization: filterSets.withoutCommercialization.length,
      recentlyArchived: filterSets.recentlyArchived.length,
    },
    filterSets,
    recentActivity,
  };
}
