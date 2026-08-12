import {
  evaluateTraceabilityForMode,
  runStagingPreflight,
  skippedStagingPreflight,
  type PreflightPrisma,
} from './staging-preflight';
import { PILOT_EXPECTED_CHILD_COUNTS } from './property-tree-baseline';

const PILOT_PROPERTY_ID = 'prop-5312';
const LISTING_ID = 'listing-5312';

function mockPrisma(overrides: Partial<PreflightPrisma> = {}): PreflightPrisma {
  const base: PreflightPrisma = {
    tenant: {
      findUnique: () =>
        Promise.resolve({
          id: 'tenant-1',
          slug: 'demo',
          status: 'ACTIVE',
        }),
    },
    user: {
      findMany: () =>
        Promise.resolve([
          {
            id: 'user-1',
            email: 'admin@demo.valorar.dev',
            tenantId: 'tenant-1',
            isActive: true,
            role: 'TENANT_ADMIN',
          },
        ]),
      count: () => Promise.resolve(5),
    },
    property: {
      findMany: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
    },
    propertyListing: {
      findMany: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
    },
    propertyPrice: { count: () => Promise.resolve(0) },
    propertyImage: { count: () => Promise.resolve(0) },
    propertyFeatureAssignment: { count: () => Promise.resolve(0) },
    propertyAgentAccess: { count: () => Promise.resolve(0) },
    propertyFeature: {
      findFirst: () =>
        Promise.resolve({
          id: 'f1',
          slug: 'uso-comercial',
          isActive: true,
        }),
    },
    country: {
      findFirst: () => Promise.resolve({ id: 'c1', iso2: 'AR' }),
    },
    province: { count: () => Promise.resolve(24) },
    locality: { count: () => Promise.resolve(100) },
    development: { count: () => Promise.resolve(1) },
    migrationSourceRef: {
      findMany: () => Promise.resolve([]),
    },
    $queryRawUnsafe: () => Promise.resolve([{ '?column?': 1 }]),
  };
  return { ...base, ...overrides };
}

function pilotOnlyPrisma(): PreflightPrisma {
  return mockPrisma({
    property: {
      findMany: () => Promise.resolve([{ id: PILOT_PROPERTY_ID }]),
      count: () => Promise.resolve(1),
    },
    propertyListing: {
      findMany: () => Promise.resolve([{ id: LISTING_ID }]),
      count: () => Promise.resolve(1),
    },
    propertyPrice: {
      count: () => Promise.resolve(1),
    },
    propertyImage: {
      count: () => Promise.resolve(PILOT_EXPECTED_CHILD_COUNTS.images),
    },
    propertyFeatureAssignment: {
      count: () => Promise.resolve(1),
    },
    propertyAgentAccess: {
      count: () => Promise.resolve(1),
    },
    migrationSourceRef: {
      findMany: () =>
        Promise.resolve([
          {
            entityId: PILOT_PROPERTY_ID,
            sourceId: '5312',
            entityType: 'property',
            migrationBatchId: 'batch-pilot',
          },
        ]),
    },
  });
}

describe('staging preflight', () => {
  it('passes empty property tree + pilot feature on healthy staging mock', async () => {
    const result = await runStagingPreflight({
      prisma: mockPrisma(),
      tenantSlug: 'demo',
      ownerEmail: 'admin@demo.valorar.dev',
    });
    expect(result.performed).toBe(true);
    expect(result.propertyTreeEmpty).toBe(true);
    expect(result.importBaselineMode).toBe('initial-empty-tree');
    expect(result.pilotFeature.present).toBe(true);
    expect(result.owner.ok).toBe(true);
    expect(result.pilotBlockers).toEqual([]);
    expect(result.baseline.userCount).toBe(5);
    expect(result.baseline.developmentCount).toBe(1);
    expect(
      result.informativeWarnings.some(
        (w) => w.code === 'STAGING_BASELINE_INFO',
      ),
    ).toBe(true);
  });

  it('allows post-pilot baseline when only consistent WP 5312 is present', async () => {
    const result = await runStagingPreflight({
      prisma: pilotOnlyPrisma(),
      tenantSlug: 'demo',
      ownerEmail: 'admin@demo.valorar.dev',
    });
    expect(result.propertyTreeEmpty).toBe(false);
    expect(result.importBaselineMode).toBe('post-pilot-controlled');
    expect(result.pilotBlockers).toEqual([]);
    expect(
      result.informativeWarnings.some((w) => w.code === 'POST_PILOT_BASELINE'),
    ).toBe(true);
  });

  it('adds blocker when property tree has untraced foreign property', async () => {
    const result = await runStagingPreflight({
      prisma: mockPrisma({
        property: {
          findMany: () =>
            Promise.resolve([{ id: PILOT_PROPERTY_ID }, { id: 'foreign' }]),
          count: () => Promise.resolve(2),
        },
        propertyListing: {
          findMany: (args: unknown) => {
            const propertyId = (args as { where?: { propertyId?: string } })
              .where?.propertyId;
            if (propertyId === PILOT_PROPERTY_ID) {
              return Promise.resolve([{ id: LISTING_ID }]);
            }
            return Promise.resolve([]);
          },
          count: () => Promise.resolve(1),
        },
        propertyPrice: { count: () => Promise.resolve(1) },
        propertyImage: {
          count: (args?: { where?: { propertyId?: string } }) => {
            if (args?.where?.propertyId === PILOT_PROPERTY_ID) {
              return Promise.resolve(7);
            }
            return Promise.resolve(0);
          },
        },
        propertyFeatureAssignment: {
          count: (args?: { where?: { propertyId?: string } }) =>
            Promise.resolve(
              args?.where?.propertyId === PILOT_PROPERTY_ID ? 1 : 0,
            ),
        },
        propertyAgentAccess: {
          count: (args?: { where?: { propertyId?: string } }) =>
            Promise.resolve(
              args?.where?.propertyId === PILOT_PROPERTY_ID ? 1 : 0,
            ),
        },
        migrationSourceRef: {
          findMany: () =>
            Promise.resolve([
              {
                entityId: PILOT_PROPERTY_ID,
                sourceId: '5312',
                entityType: 'property',
                migrationBatchId: 'batch-pilot',
              },
            ]),
        },
      }),
      tenantSlug: 'demo',
      ownerEmail: 'admin@demo.valorar.dev',
    });
    expect(result.importBaselineMode).toBe('blocked');
    expect(
      result.pilotBlockers.some(
        (b) => b.code === 'UNTRACED_PROPERTIES_PRESENT',
      ),
    ).toBe(true);
  });

  it('blocks inconsistent pilot child counts', async () => {
    const result = await runStagingPreflight({
      prisma: mockPrisma({
        property: {
          findMany: () => Promise.resolve([{ id: PILOT_PROPERTY_ID }]),
          count: () => Promise.resolve(1),
        },
        propertyListing: {
          findMany: () => Promise.resolve([{ id: LISTING_ID }]),
          count: () => Promise.resolve(1),
        },
        propertyPrice: { count: () => Promise.resolve(1) },
        propertyImage: { count: () => Promise.resolve(2) },
        propertyFeatureAssignment: { count: () => Promise.resolve(1) },
        propertyAgentAccess: { count: () => Promise.resolve(1) },
        migrationSourceRef: {
          findMany: () =>
            Promise.resolve([
              {
                entityId: PILOT_PROPERTY_ID,
                sourceId: '5312',
                entityType: 'property',
                migrationBatchId: 'batch-pilot',
              },
            ]),
        },
      }),
      tenantSlug: 'demo',
      ownerEmail: 'admin@demo.valorar.dev',
    });
    expect(result.importBaselineMode).toBe('blocked');
    expect(
      result.pilotBlockers.some((b) => b.code === 'PILOT_TREE_INCONSISTENT'),
    ).toBe(true);
  });

  it('treats MigrationSourceRef absence as dry-run warning + import blocker', () => {
    const dry = evaluateTraceabilityForMode({
      mode: 'dry-run',
      schema: {
        available: false,
        reason: 'Table "MigrationSourceRef" not found.',
      },
    });
    expect(dry.blockers).toEqual([]);
    expect(
      dry.warnings.some((w) => w.code === 'IDEMPOTENCY_SCHEMA_UNAVAILABLE'),
    ).toBe(true);
    expect(
      dry.importBlockers.some(
        (b) => b.code === 'IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT',
      ),
    ).toBe(true);
    expect(dry.idempotencySchemaAvailable).toBe(false);
    expect(dry.idempotencyDbCheckPerformed).toBe(false);

    const write = evaluateTraceabilityForMode({
      mode: 'import',
      schema: { available: false, reason: 'missing' },
    });
    expect(
      write.blockers.some(
        (b) => b.code === 'IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT',
      ),
    ).toBe(true);
  });

  it('skipped preflight marks pilot blocker and does not claim gates', () => {
    const skipped = skippedStagingPreflight();
    expect(skipped.performed).toBe(false);
    expect(skipped.importBaselineMode).toBe('blocked');
    expect(
      skipped.pilotBlockers.some((b) => b.code === 'PREFLIGHT_SKIPPED'),
    ).toBe(true);
  });
});
