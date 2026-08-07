import {
  evaluateTraceabilityForMode,
  runStagingPreflight,
  skippedStagingPreflight,
  type PreflightPrisma,
} from './staging-preflight';

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
    property: { count: () => Promise.resolve(0) },
    propertyListing: { count: () => Promise.resolve(0) },
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
    $queryRawUnsafe: () => Promise.resolve([]),
  };
  return { ...base, ...overrides };
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

  it('adds pilot blocker when property tree is not empty', async () => {
    const result = await runStagingPreflight({
      prisma: mockPrisma({
        property: { count: () => Promise.resolve(3) },
      }),
      tenantSlug: 'demo',
      ownerEmail: 'admin@demo.valorar.dev',
    });
    expect(result.propertyTreeEmpty).toBe(false);
    expect(
      result.pilotBlockers.some((b) => b.code === 'PROPERTY_TREE_NOT_EMPTY'),
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
    expect(
      skipped.pilotBlockers.some((b) => b.code === 'PREFLIGHT_SKIPPED'),
    ).toBe(true);
  });
});
