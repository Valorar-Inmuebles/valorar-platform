import type { TenantCounts } from './types';

/** Minimal Prisma surface used by cleanup (avoids coupling to generated types in tests). */
export type CleanupPrisma = {
  tenant: {
    findMany: (args: {
      where: { slug: string };
      select: { id: true; slug: true };
    }) => Promise<{ id: string; slug: string }[]>;
  };
  property: {
    count: (args: { where: { tenantId: string } }) => Promise<number>;
    findMany: (args: {
      where: { tenantId: string };
      select: { id: true };
    }) => Promise<{ id: string }[]>;
  };
  propertyListing: {
    count: (args: { where: { tenantId: string } }) => Promise<number>;
  };
  propertyPrice: {
    count: (args: { where: { tenantId: string } }) => Promise<number>;
  };
  propertyImage: {
    count: (args: { where: { tenantId: string } }) => Promise<number>;
    findMany: (args: {
      where: { tenantId: string };
      orderBy: [{ propertyId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }];
      select: {
        id: true;
        propertyId: true;
        storageKey: true;
        url: true;
        mimeType: true;
        fileSize: true;
        isCover: true;
        sortOrder: true;
      };
    }) => Promise<
      {
        id: string;
        propertyId: string;
        storageKey: string;
        url: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isCover: boolean;
        sortOrder: number;
      }[]
    >;
  };
  propertyFeatureAssignment: {
    count: (args: { where: { tenantId: string } }) => Promise<number>;
  };
  propertyAgentAccess: {
    count: (args: { where: { tenantId: string } }) => Promise<number>;
  };
  $transaction?: <T>(fn: (tx: CleanupPrisma) => Promise<T>) => Promise<T>;
  $executeRawUnsafe?: (query: string, ...values: unknown[]) => Promise<number>;
};

export async function resolveExactDemoTenant(
  prisma: CleanupPrisma,
  slug: string,
): Promise<{ id: string; slug: string }> {
  const tenants = await prisma.tenant.findMany({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (tenants.length !== 1) {
    throw new Error(
      tenants.length === 0
        ? `No tenant found with slug="${slug}". Aborting.`
        : `Expected exactly one tenant with slug="${slug}", found ${tenants.length}. Aborting.`,
    );
  }
  const [tenant] = tenants;
  if (!tenant) {
    throw new Error(`No tenant found with slug="${slug}". Aborting.`);
  }
  return tenant;
}

export async function countPropertyTreeByTenant(
  prisma: CleanupPrisma,
  tenantId: string,
): Promise<TenantCounts> {
  const [
    Property,
    PropertyListing,
    PropertyPrice,
    PropertyImage,
    PropertyFeatureAssignment,
    PropertyAgentAccess,
  ] = await Promise.all([
    prisma.property.count({ where: { tenantId } }),
    prisma.propertyListing.count({ where: { tenantId } }),
    prisma.propertyPrice.count({ where: { tenantId } }),
    prisma.propertyImage.count({ where: { tenantId } }),
    prisma.propertyFeatureAssignment.count({ where: { tenantId } }),
    prisma.propertyAgentAccess.count({ where: { tenantId } }),
  ]);

  return {
    Property,
    PropertyListing,
    PropertyPrice,
    PropertyImage,
    PropertyFeatureAssignment,
    PropertyAgentAccess,
  };
}

export async function loadDemoPropertyIds(
  prisma: CleanupPrisma,
  tenantId: string,
): Promise<string[]> {
  const rows = await prisma.property.findMany({
    where: { tenantId },
    select: { id: true },
  });
  return rows.map((r) => r.id).sort((a, b) => a.localeCompare(b));
}

export async function loadDemoPropertyImages(
  prisma: CleanupPrisma,
  tenantId: string,
) {
  return prisma.propertyImage.findMany({
    where: { tenantId },
    orderBy: [{ propertyId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      propertyId: true,
      storageKey: true,
      url: true,
      mimeType: true,
      fileSize: true,
      isCover: true,
      sortOrder: true,
    },
  });
}
