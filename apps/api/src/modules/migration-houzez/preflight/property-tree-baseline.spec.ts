import {
  evaluatePropertyTreeBaseline,
  pilotChildCountsMatch,
  PILOT_EXPECTED_CHILD_COUNTS,
  type PropertyTreeBaselinePrisma,
} from './property-tree-baseline';

const TENANT = 'tenant-demo';
const PILOT_PROPERTY_ID = 'prop-5312';
const LISTING_ID = 'listing-5312';

function emptyCounts() {
  return {
    Property: 0,
    PropertyListing: 0,
    PropertyPrice: 0,
    PropertyImage: 0,
    PropertyFeatureAssignment: 0,
    PropertyAgentAccess: 0,
  };
}

function mockPrisma(input?: {
  properties?: Array<{ id: string }>;
  propertyRefs?: Array<{
    entityId: string;
    sourceId: string;
    entityType: string;
    migrationBatchId: string;
  }>;
  listings?: Array<{ id: string; propertyId: string }>;
  pricesByListing?: Record<string, number>;
  imagesByProperty?: Record<string, number>;
  featuresByProperty?: Record<string, number>;
  accessByProperty?: Record<string, number>;
  omitMsr?: boolean;
}): PropertyTreeBaselinePrisma {
  const properties = input?.properties ?? [];
  const propertyRefs = input?.propertyRefs ?? [];
  const listings = input?.listings ?? [];
  const pricesByListing = input?.pricesByListing ?? {};
  const imagesByProperty = input?.imagesByProperty ?? {};
  const featuresByProperty = input?.featuresByProperty ?? {};
  const accessByProperty = input?.accessByProperty ?? {};

  const countWhere = (
    rows: number | ((where: Record<string, unknown> | undefined) => number),
  ) => {
    return (args?: { where?: Record<string, unknown> }) => {
      if (typeof rows === 'number') return Promise.resolve(rows);
      return Promise.resolve(rows(args?.where));
    };
  };

  const prisma: PropertyTreeBaselinePrisma = {
    property: {
      findMany: () => Promise.resolve(properties),
      count: countWhere(properties.length),
    },
    propertyListing: {
      findMany: (args: unknown) => {
        const where = (args as { where?: { propertyId?: string } }).where;
        const filtered = where?.propertyId
          ? listings.filter((l) => l.propertyId === where.propertyId)
          : listings;
        return Promise.resolve(filtered.map((l) => ({ id: l.id })));
      },
      count: countWhere(listings.length),
    },
    propertyPrice: {
      count: (args?: { where?: { listingId?: { in?: string[] } } }) => {
        const ids = args?.where?.listingId?.in ?? [];
        if (ids.length) {
          return Promise.resolve(
            ids.reduce((sum, id) => sum + (pricesByListing[id] ?? 0), 0),
          );
        }
        return Promise.resolve(
          Object.values(pricesByListing).reduce((a, b) => a + b, 0),
        );
      },
    },
    propertyImage: {
      count: (args?: { where?: { propertyId?: string } }) => {
        const propertyId = args?.where?.propertyId;
        if (propertyId)
          return Promise.resolve(imagesByProperty[propertyId] ?? 0);
        return Promise.resolve(
          Object.values(imagesByProperty).reduce((a, b) => a + b, 0),
        );
      },
    },
    propertyFeatureAssignment: {
      count: (args?: { where?: { propertyId?: string } }) => {
        const propertyId = args?.where?.propertyId;
        if (propertyId)
          return Promise.resolve(featuresByProperty[propertyId] ?? 0);
        return Promise.resolve(
          Object.values(featuresByProperty).reduce((a, b) => a + b, 0),
        );
      },
    },
    propertyAgentAccess: {
      count: (args?: { where?: { propertyId?: string } }) => {
        const propertyId = args?.where?.propertyId;
        if (propertyId)
          return Promise.resolve(accessByProperty[propertyId] ?? 0);
        return Promise.resolve(
          Object.values(accessByProperty).reduce((a, b) => a + b, 0),
        );
      },
    },
  };

  if (!input?.omitMsr) {
    prisma.migrationSourceRef = {
      findMany: () => Promise.resolve(propertyRefs),
    };
  }

  return prisma;
}

function consistentPilotMocks(extra?: {
  properties?: Array<{ id: string }>;
  propertyRefs?: Array<{
    entityId: string;
    sourceId: string;
    entityType: string;
    migrationBatchId: string;
  }>;
  listings?: Array<{ id: string; propertyId: string }>;
  pricesByListing?: Record<string, number>;
  imagesByProperty?: Record<string, number>;
  featuresByProperty?: Record<string, number>;
  accessByProperty?: Record<string, number>;
}) {
  return mockPrisma({
    properties: extra?.properties ?? [{ id: PILOT_PROPERTY_ID }],
    propertyRefs: extra?.propertyRefs ?? [
      {
        entityId: PILOT_PROPERTY_ID,
        sourceId: '5312',
        entityType: 'property',
        migrationBatchId: 'batch-pilot',
      },
    ],
    listings: extra?.listings ?? [
      { id: LISTING_ID, propertyId: PILOT_PROPERTY_ID },
    ],
    pricesByListing: extra?.pricesByListing ?? { [LISTING_ID]: 1 },
    imagesByProperty: extra?.imagesByProperty ?? {
      [PILOT_PROPERTY_ID]: PILOT_EXPECTED_CHILD_COUNTS.images,
    },
    featuresByProperty: extra?.featuresByProperty ?? {
      [PILOT_PROPERTY_ID]: 1,
    },
    accessByProperty: extra?.accessByProperty ?? {
      [PILOT_PROPERTY_ID]: 1,
    },
  });
}

describe('property-tree-baseline', () => {
  it('allows empty tree as initial-empty-tree', async () => {
    const result = await evaluatePropertyTreeBaseline({
      prisma: mockPrisma(),
      tenantId: TENANT,
    });
    expect(result.mode).toBe('initial-empty-tree');
    expect(result.propertyTreeEmpty).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.propertyTreeCounts).toEqual(emptyCounts());
  });

  it('allows tree with only consistent pilot WP 5312 as post-pilot-controlled', async () => {
    const result = await evaluatePropertyTreeBaseline({
      prisma: consistentPilotMocks(),
      tenantId: TENANT,
    });
    expect(result.mode).toBe('post-pilot-controlled');
    expect(result.propertyTreeEmpty).toBe(false);
    expect(result.blockers).toEqual([]);
    expect(result.pilot.present).toBe(true);
    expect(result.pilot.consistent).toBe(true);
    expect(result.pilot.propertyId).toBe(PILOT_PROPERTY_ID);
    expect(result.warnings.some((w) => w.code === 'POST_PILOT_BASELINE')).toBe(
      true,
    );
  });

  it('allows pilot plus additional MSR-traced properties (sequential imports)', async () => {
    const result = await evaluatePropertyTreeBaseline({
      prisma: consistentPilotMocks({
        properties: [{ id: PILOT_PROPERTY_ID }, { id: 'prop-other' }],
        propertyRefs: [
          {
            entityId: PILOT_PROPERTY_ID,
            sourceId: '5312',
            entityType: 'property',
            migrationBatchId: 'batch-pilot',
          },
          {
            entityId: 'prop-other',
            sourceId: '9999',
            entityType: 'property',
            migrationBatchId: 'batch-2',
          },
        ],
        imagesByProperty: {
          [PILOT_PROPERTY_ID]: 7,
          'prop-other': 3,
        },
        featuresByProperty: {
          [PILOT_PROPERTY_ID]: 1,
          'prop-other': 0,
        },
        accessByProperty: {
          [PILOT_PROPERTY_ID]: 1,
          'prop-other': 1,
        },
      }),
      tenantId: TENANT,
    });
    expect(result.mode).toBe('post-pilot-controlled');
    expect(result.tracedPropertyCount).toBe(2);
    expect(result.blockers).toEqual([]);
  });

  it('blocks untraced/foreign properties', async () => {
    const result = await evaluatePropertyTreeBaseline({
      prisma: consistentPilotMocks({
        properties: [{ id: PILOT_PROPERTY_ID }, { id: 'foreign-prop' }],
        // only pilot MSR — foreign-prop untraced
      }),
      tenantId: TENANT,
    });
    expect(result.mode).toBe('blocked');
    expect(
      result.blockers.some((b) => b.code === 'UNTRACED_PROPERTIES_PRESENT'),
    ).toBe(true);
  });

  it('blocks when pilot WP 5312 is inconsistent', async () => {
    const result = await evaluatePropertyTreeBaseline({
      prisma: consistentPilotMocks({
        imagesByProperty: { [PILOT_PROPERTY_ID]: 3 },
      }),
      tenantId: TENANT,
    });
    expect(result.mode).toBe('blocked');
    expect(
      result.blockers.some((b) => b.code === 'PILOT_TREE_INCONSISTENT'),
    ).toBe(true);
  });

  it('blocks non-empty tree without pilot MSR', async () => {
    const result = await evaluatePropertyTreeBaseline({
      prisma: mockPrisma({
        properties: [{ id: 'prop-x' }],
        propertyRefs: [
          {
            entityId: 'prop-x',
            sourceId: '9999',
            entityType: 'property',
            migrationBatchId: 'batch-x',
          },
        ],
        listings: [{ id: 'l1', propertyId: 'prop-x' }],
        pricesByListing: { l1: 1 },
        imagesByProperty: { 'prop-x': 1 },
        featuresByProperty: { 'prop-x': 0 },
        accessByProperty: { 'prop-x': 1 },
      }),
      tenantId: TENANT,
    });
    expect(result.mode).toBe('blocked');
    expect(result.blockers.some((b) => b.code === 'PILOT_MSR_MISSING')).toBe(
      true,
    );
  });

  it('pilotChildCountsMatch validates expected shape', () => {
    expect(pilotChildCountsMatch(PILOT_EXPECTED_CHILD_COUNTS)).toBe(true);
    expect(
      pilotChildCountsMatch({ ...PILOT_EXPECTED_CHILD_COUNTS, images: 6 }),
    ).toBe(false);
  });
});
