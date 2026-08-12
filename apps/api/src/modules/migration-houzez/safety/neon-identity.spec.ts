import { PRODUCTION_NEON_IDENTITY } from '../constants';
import {
  assertProductionNeonIdentity,
  readNeonIdentityFromDb,
  type NeonIdentityPrisma,
} from './neon-identity';

function makePrisma(
  settings: Record<string, string | null>,
): NeonIdentityPrisma {
  return {
    $queryRawUnsafe: jest.fn((query: string) => {
      const match = query.match(/current_setting\('([^']+)'/);
      const key = match?.[1] ?? '';
      const value = settings[key] ?? null;
      return Promise.resolve([{ v: value }]);
    }),
  };
}

describe('readNeonIdentityFromDb', () => {
  it('reads neon GUCs via $queryRawUnsafe', async () => {
    const prisma = makePrisma({
      'neon.project_id': PRODUCTION_NEON_IDENTITY.projectId,
      'neon.branch_id': PRODUCTION_NEON_IDENTITY.branchId,
      'neon.endpoint_id': PRODUCTION_NEON_IDENTITY.endpointId,
      application_name: 'psql',
    });

    const identity = await readNeonIdentityFromDb(prisma);
    expect(identity).toEqual({
      projectId: PRODUCTION_NEON_IDENTITY.projectId,
      branchId: PRODUCTION_NEON_IDENTITY.branchId,
      endpointId: PRODUCTION_NEON_IDENTITY.endpointId,
      applicationName: 'psql',
    });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(4);
  });
});

describe('assertProductionNeonIdentity', () => {
  it('accepts matching audited production identity', async () => {
    const prisma = makePrisma({
      'neon.project_id': PRODUCTION_NEON_IDENTITY.projectId,
      'neon.branch_id': PRODUCTION_NEON_IDENTITY.branchId,
      'neon.endpoint_id': PRODUCTION_NEON_IDENTITY.endpointId,
      application_name: null,
    });

    const result = await assertProductionNeonIdentity(prisma);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.projectId).toBe(PRODUCTION_NEON_IDENTITY.projectId);
    expect(result.identity.branchId).toBe(PRODUCTION_NEON_IDENTITY.branchId);
    expect(result.identity.endpointId).toBe(
      PRODUCTION_NEON_IDENTITY.endpointId,
    );
  });

  it('refuses mismatched neon identity', async () => {
    const prisma = makePrisma({
      'neon.project_id': 'other-project',
      'neon.branch_id': 'br-other',
      'neon.endpoint_id': 'ep-other',
      application_name: null,
    });

    const result = await assertProductionNeonIdentity(prisma);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /project_id/i.test(e))).toBe(true);
    expect(result.errors.some((e) => /branch_id/i.test(e))).toBe(true);
    expect(result.errors.some((e) => /endpoint_id/i.test(e))).toBe(true);
  });

  it('refuses incomplete neon GUCs', async () => {
    const prisma = makePrisma({
      'neon.project_id': PRODUCTION_NEON_IDENTITY.projectId,
      'neon.branch_id': null,
      'neon.endpoint_id': null,
      application_name: null,
    });

    const result = await assertProductionNeonIdentity(prisma);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /incomplete/i.test(e))).toBe(true);
  });
});
