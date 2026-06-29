import {
  Prisma,
  PropertyListingStatus,
} from '../generated/prisma/client';
import type { PrismaClient } from '../generated/prisma/client';
import { DEMO_TENANT_SLUG } from './seed-data';
import {
  daysAgo,
  DEMO_PROPERTIES,
  resolveDemoImagePaths,
  type DemoListingSpec,
  type DemoPropertySpec,
} from './seed-demo-properties-data';

const DEMO_AGENT_EMAIL = 'agent@demo.valorar.dev';

export type SeedDemoPropertiesResult = {
  propertyCount: number;
  listingCount: number;
  imageCount: number;
  featureAssignmentCount: number;
};

function resolvePublishedAt(listing: DemoListingSpec): Date | null {
  if (listing.publishedDaysAgo == null) {
    return null;
  }

  return daysAgo(listing.publishedDaysAgo);
}

function buildListingUpdateData(
  listing: DemoListingSpec,
): Prisma.PropertyListingUpdateInput {
  return {
    status: PropertyListingStatus.ACTIVE,
    isFeatured: listing.isFeatured ?? false,
    publishedAt: resolvePublishedAt(listing),
    closedAt: null,
    expensesAmount:
      listing.expenses != null ? listing.expenses.amount : null,
    expensesCurrency: listing.expenses?.currency ?? null,
  };
}

function buildListingCreateData(
  tenantId: string,
  propertyId: string,
  listing: DemoListingSpec,
): Prisma.PropertyListingCreateInput {
  return {
    tenant: { connect: { id: tenantId } },
    property: { connect: { id: propertyId } },
    listingType: listing.listingType,
    status: PropertyListingStatus.ACTIVE,
    isFeatured: listing.isFeatured ?? false,
    publishedAt: resolvePublishedAt(listing),
    expensesAmount:
      listing.expenses != null ? listing.expenses.amount : null,
    expensesCurrency: listing.expenses?.currency ?? null,
  };
}

async function syncListingPrices(
  prisma: PrismaClient,
  tenantId: string,
  listingId: string,
  prices: DemoListingSpec['prices'],
): Promise<void> {
  await prisma.propertyPrice.deleteMany({
    where: { listingId, tenantId },
  });

  if (prices.length === 0) {
    return;
  }

  let primaryAssigned = false;

  await prisma.propertyPrice.createMany({
    data: prices.map((price) => {
      const isPrimary =
        price.isPrimary === true ||
        (!primaryAssigned && price.isPrimary !== false);

      if (isPrimary) {
        primaryAssigned = true;
      }

      return {
        tenantId,
        listingId,
        amount: price.amount,
        currency: price.currency,
        isPrimary,
        label: price.label ?? null,
      };
    }),
  });

  if (!primaryAssigned) {
    const firstPrice = await prisma.propertyPrice.findFirst({
      where: { listingId, tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (firstPrice) {
      await prisma.propertyPrice.update({
        where: { id: firstPrice.id },
        data: { isPrimary: true },
      });
    }
  }
}

async function syncPropertyImages(
  prisma: PrismaClient,
  tenantId: string,
  propertyId: string,
  spec: DemoPropertySpec,
): Promise<number> {
  await prisma.propertyImage.deleteMany({
    where: { propertyId, tenantId },
  });

  const images = resolveDemoImagePaths(spec.slug, spec.imageAsset);

  await prisma.propertyImage.createMany({
    data: images.map((image) => ({
      tenantId,
      propertyId,
      storageKey: image.storageKey,
      url: image.url,
      altText: image.altText,
      mimeType: 'image/webp',
      sortOrder: image.sortOrder,
      isCover: image.isCover,
    })),
  });

  return images.length;
}

async function syncFeatureAssignments(
  prisma: PrismaClient,
  tenantId: string,
  propertyId: string,
  featureSlugs: string[] | undefined,
  featureIdBySlug: Map<string, string>,
): Promise<number> {
  if (!featureSlugs || featureSlugs.length === 0) {
    return 0;
  }

  let count = 0;

  for (const slug of featureSlugs) {
    const featureId = featureIdBySlug.get(slug);

    if (!featureId) {
      console.warn(`  [seed-demo] Skipping unknown feature slug: ${slug}`);
      continue;
    }

    await prisma.propertyFeatureAssignment.upsert({
      where: {
        propertyId_featureId: { propertyId, featureId },
      },
      update: { tenantId },
      create: {
        tenantId,
        propertyId,
        featureId,
      },
    });

    count += 1;
  }

  return count;
}

async function syncListing(
  prisma: PrismaClient,
  tenantId: string,
  propertyId: string,
  listing: DemoListingSpec,
): Promise<void> {
  const record = await prisma.propertyListing.upsert({
    where: {
      propertyId_listingType: {
        propertyId,
        listingType: listing.listingType,
      },
    },
    update: buildListingUpdateData(listing),
    create: buildListingCreateData(tenantId, propertyId, listing),
  });

  await syncListingPrices(prisma, tenantId, record.id, listing.prices);
}

async function syncProperty(
  prisma: PrismaClient,
  tenantId: string,
  createdById: string,
  spec: DemoPropertySpec,
  featureIdBySlug: Map<string, string>,
): Promise<{
  listingCount: number;
  imageCount: number;
  featureAssignmentCount: number;
}> {
  const updatedAt =
    spec.updatedDaysAgo != null ? daysAgo(spec.updatedDaysAgo) : undefined;

  const property = await prisma.property.upsert({
    where: {
      tenantId_slug: { tenantId, slug: spec.slug },
    },
    update: {
      title: spec.title,
      description: spec.description,
      propertyType: spec.propertyType,
      condition: spec.condition ?? null,
      internalCode: spec.internalCode ?? null,
      isActive: true,
      street: spec.location.street ?? null,
      streetNumber: spec.location.streetNumber ?? null,
      floor: spec.location.floor ?? null,
      apartment: spec.location.apartment ?? null,
      neighborhood: spec.location.neighborhood,
      city: spec.location.city,
      province: spec.location.province,
      country: 'AR',
      latitude: spec.location.latitude,
      longitude: spec.location.longitude,
      totalArea: spec.totalArea ?? null,
      coveredArea: spec.coveredArea ?? null,
      rooms: spec.rooms ?? null,
      bedrooms: spec.bedrooms ?? null,
      bathrooms: spec.bathrooms ?? null,
      parkingSpaces: spec.parkingSpaces ?? null,
      yearBuilt: spec.yearBuilt ?? null,
      ...(updatedAt ? { updatedAt } : {}),
    },
    create: {
      tenantId,
      createdById,
      slug: spec.slug,
      title: spec.title,
      description: spec.description,
      propertyType: spec.propertyType,
      condition: spec.condition ?? null,
      internalCode: spec.internalCode ?? null,
      isActive: true,
      street: spec.location.street ?? null,
      streetNumber: spec.location.streetNumber ?? null,
      floor: spec.location.floor ?? null,
      apartment: spec.location.apartment ?? null,
      neighborhood: spec.location.neighborhood,
      city: spec.location.city,
      province: spec.location.province,
      country: 'AR',
      latitude: spec.location.latitude,
      longitude: spec.location.longitude,
      totalArea: spec.totalArea ?? null,
      coveredArea: spec.coveredArea ?? null,
      rooms: spec.rooms ?? null,
      bedrooms: spec.bedrooms ?? null,
      bathrooms: spec.bathrooms ?? null,
      parkingSpaces: spec.parkingSpaces ?? null,
      yearBuilt: spec.yearBuilt ?? null,
      ...(updatedAt ? { updatedAt } : {}),
    },
  });

  const listings = [spec.listing, ...(spec.extraListings ?? [])];

  for (const listing of listings) {
    await syncListing(prisma, tenantId, property.id, listing);
  }

  const imageCount = await syncPropertyImages(
    prisma,
    tenantId,
    property.id,
    spec,
  );

  const featureAssignmentCount = await syncFeatureAssignments(
    prisma,
    tenantId,
    property.id,
    spec.featureSlugs,
    featureIdBySlug,
  );

  return {
    listingCount: listings.length,
    imageCount,
    featureAssignmentCount,
  };
}

export function isDemoPropertiesSeedEnabled(): boolean {
  return process.env.SEED_DEMO_PROPERTIES?.trim().toLowerCase() === 'true';
}

export async function seedDemoProperties(
  prisma: PrismaClient,
): Promise<SeedDemoPropertiesResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
  });

  if (!tenant) {
    throw new Error(
      `Demo tenant "${DEMO_TENANT_SLUG}" not found. Run base seed first.`,
    );
  }

  const agent = await prisma.user.findUnique({
    where: { email: DEMO_AGENT_EMAIL },
  });

  if (!agent || agent.tenantId !== tenant.id) {
    throw new Error(
      `Demo agent "${DEMO_AGENT_EMAIL}" not found for tenant "${DEMO_TENANT_SLUG}".`,
    );
  }

  const features = await prisma.propertyFeature.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  const featureIdBySlug = new Map(features.map((f) => [f.slug, f.id]));

  let listingCount = 0;
  let imageCount = 0;
  let featureAssignmentCount = 0;

  for (const spec of DEMO_PROPERTIES) {
    const result = await syncProperty(
      prisma,
      tenant.id,
      agent.id,
      spec,
      featureIdBySlug,
    );

    listingCount += result.listingCount;
    imageCount += result.imageCount;
    featureAssignmentCount += result.featureAssignmentCount;
  }

  return {
    propertyCount: DEMO_PROPERTIES.length,
    listingCount,
    imageCount,
    featureAssignmentCount,
  };
}

export async function countPublishableDemoProperties(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  return prisma.property.count({
    where: {
      tenantId,
      isActive: true,
      images: { some: { isCover: true, tenantId } },
      listings: {
        some: {
          tenantId,
          status: PropertyListingStatus.ACTIVE,
          prices: { some: { isPrimary: true, tenantId } },
        },
      },
    },
  });
}

export async function countFeaturedDemoListings(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  return prisma.propertyListing.count({
    where: {
      tenantId,
      status: PropertyListingStatus.ACTIVE,
      isFeatured: true,
      prices: { some: { isPrimary: true, tenantId } },
      property: {
        isActive: true,
        images: { some: { isCover: true, tenantId } },
      },
    },
  });
}
