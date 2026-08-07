import {
  assertSourceIdentityRules,
  buildRollbackPlan,
  checkPropertyIdempotency,
} from './idempotency';

describe('traceability idempotency', () => {
  it('reports pending when schema unavailable', async () => {
    const result = await checkPropertyIdempotency({
      prisma: {},
      schema: {
        available: false,
        reason: 'not applied',
      },
      tenantId: 't1',
      sourceId: '5312',
    });
    expect(result.existingPropertyRef).toBeNull();
    expect(result.note).toMatch(/pending/i);
  });

  it('returns existing ref on first-tenant hit', async () => {
    const result = await checkPropertyIdempotency({
      prisma: {
        migrationSourceRef: {
          findUnique: () =>
            Promise.resolve({
              entityId: 'prop_1',
              migrationBatchId: 'batch_1',
              entityType: 'property',
              metadata: {},
            }),
          findMany: () => Promise.resolve([]),
        },
      },
      schema: { available: true },
      tenantId: 't1',
      sourceId: '5312',
    });
    expect(result.existingPropertyRef).toEqual({
      entityId: 'prop_1',
      migrationBatchId: 'batch_1',
    });
  });

  it('allows same sourceId on another tenant conceptually', () => {
    const rules = assertSourceIdentityRules({
      existingSameTenantProperty: false,
      existingOtherTenantProperty: true,
      existingSameSourceDifferentEntityType: true,
    });
    expect(rules.ok).toBe(true);
  });

  it('flags same-tenant duplicate property source', () => {
    const rules = assertSourceIdentityRules({
      existingSameTenantProperty: true,
      existingOtherTenantProperty: false,
      existingSameSourceDifferentEntityType: false,
    });
    expect(rules.ok).toBe(false);
  });

  it('builds ordered rollback dry-run plan', () => {
    const plan = buildRollbackPlan({
      migrationBatchId: 'batch_1',
      tenantId: 't1',
      refs: [
        {
          entityType: 'property',
          entityId: 'p1',
          sourceId: '5312',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
        {
          entityType: 'property_image',
          entityId: 'i1',
          sourceId: '10',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
        {
          entityType: 'property_price',
          entityId: 'pr1',
          sourceId: '5312',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
      ],
    });
    expect(plan.dryRun).toBe(true);
    expect(plan.items.map((i) => i.entityType)).toEqual([
      'property_image',
      'property_price',
      'property',
    ]);
    expect(plan.guards.length).toBeGreaterThan(3);
  });
});
