import { PRODUCTION_NEON_IDENTITY } from '../constants';

export type NeonIdentitySnapshot = {
  projectId: string | null;
  branchId: string | null;
  endpointId: string | null;
  applicationName: string | null;
};

export type NeonIdentityCheckResult =
  | { ok: true; identity: NeonIdentitySnapshot }
  | { ok: false; errors: string[]; identity: NeonIdentitySnapshot };

export type NeonIdentityPrisma = {
  $queryRawUnsafe: (query: string) => Promise<unknown>;
};

async function readSetting(
  prisma: NeonIdentityPrisma,
  key: string,
): Promise<string | null> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT current_setting('${key}', true) AS v`,
  )) as Array<{ v: string | null }>;
  const value = rows[0]?.v;
  return value && String(value).trim() ? String(value).trim() : null;
}

/** Read Neon GUCs when exposed (sanitized; no secrets). */
export async function readNeonIdentityFromDb(
  prisma: NeonIdentityPrisma,
): Promise<NeonIdentitySnapshot> {
  const [projectId, branchId, endpointId, applicationName] = await Promise.all([
    readSetting(prisma, 'neon.project_id'),
    readSetting(prisma, 'neon.branch_id'),
    readSetting(prisma, 'neon.endpoint_id'),
    readSetting(prisma, 'application_name'),
  ]);
  return { projectId, branchId, endpointId, applicationName };
}

/**
 * Fail-closed production identity check against E.5 audited constants.
 * Does not print URLs or credentials.
 */
export async function assertProductionNeonIdentity(
  prisma: NeonIdentityPrisma,
): Promise<NeonIdentityCheckResult> {
  const identity = await readNeonIdentityFromDb(prisma);
  const errors: string[] = [];

  if (!identity.projectId || !identity.branchId || !identity.endpointId) {
    errors.push(
      'Neon identity GUCs are incomplete on this connection (project/branch/endpoint required for production).',
    );
  }
  if (identity.projectId !== PRODUCTION_NEON_IDENTITY.projectId) {
    errors.push(
      'Live neon.project_id does not match audited production identity.',
    );
  }
  if (identity.branchId !== PRODUCTION_NEON_IDENTITY.branchId) {
    errors.push(
      'Live neon.branch_id does not match audited production identity.',
    );
  }
  if (identity.endpointId !== PRODUCTION_NEON_IDENTITY.endpointId) {
    errors.push(
      'Live neon.endpoint_id does not match audited production identity.',
    );
  }

  if (errors.length) {
    return { ok: false, errors, identity };
  }
  return { ok: true, identity };
}
