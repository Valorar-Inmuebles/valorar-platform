import {
  PRODUCTION_CLEANUP_TARGET,
  STAGING_CLEANUP_TARGET,
  isHouzezCleanupTarget,
  type HouzezCleanupTarget,
} from './constants';
import {
  PRODUCTION_MIGRATION_TARGET,
  PRODUCTION_NEON_IDENTITY,
} from '../constants';
import type { SafetyGateResult } from './types';
import { extractHostnameFromDatabaseUrl, maskDbHost } from '../safety/db-host';

/** Re-export shared host helpers (behavior unchanged for cleanup consumers). */
export { extractHostnameFromDatabaseUrl, maskDbHost };

export type SafetyEnv = {
  houzezStagingDatabaseUrl?: string;
  houzezCheckpointDatabaseUrl?: string;
  houzezStagingDbHost?: string;
  houzezProductionDatabaseUrl?: string;
  houzezProductionDbHost?: string;
  houzezProductionNeonProjectId?: string;
  houzezProductionNeonBranchId?: string;
  houzezProductionNeonEndpointId?: string;
  houzezCleanupTarget?: string;
  databaseUrl?: string;
};

export type CleanupSafetyGateResult = SafetyGateResult & {
  cleanupTarget?: HouzezCleanupTarget;
  requiresLiveNeonIdentityCheck?: boolean;
};

function pushDirectHostErrors(
  errors: string[],
  urlHost: string,
  authorizedHost: string,
  label: string,
): void {
  if (urlHost.includes('-pooler')) {
    errors.push(
      `Refusing pooled connection: ${label} host must be direct (no "-pooler").`,
    );
  }
  if (authorizedHost.includes('-pooler')) {
    errors.push(
      `${label} DB host allowlist must not contain "-pooler" (direct endpoint required).`,
    );
  }
  if (urlHost !== authorizedHost) {
    errors.push(
      `${label} URL host does not match allowlist (masked url=${maskDbHost(urlHost)}, masked allowlist=${maskDbHost(authorizedHost)}).`,
    );
  }
}

function validateStagingCleanup(env: SafetyEnv): CleanupSafetyGateResult {
  const errors: string[] = [];
  const stagingUrl = env.houzezStagingDatabaseUrl?.trim();
  const checkpointUrl = env.houzezCheckpointDatabaseUrl?.trim();
  const authorizedHost = env.houzezStagingDbHost?.trim();
  const databaseUrl = env.databaseUrl?.trim();

  if (!stagingUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL is required (no DATABASE_URL fallback).',
    );
  }
  if (!authorizedHost) {
    errors.push(
      'HOUZEZ_STAGING_DB_HOST is required (full authorized staging hostname; must match URL host exactly).',
    );
  }
  if (!stagingUrl || !authorizedHost) {
    return { ok: false, errors };
  }

  if (checkpointUrl && stagingUrl === checkpointUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL must not equal HOUZEZ_CHECKPOINT_DATABASE_URL.',
    );
  }
  if (databaseUrl && stagingUrl === databaseUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL must not be identical to DATABASE_URL for this procedure.',
    );
  }

  const urlHost = extractHostnameFromDatabaseUrl(stagingUrl);
  if (!urlHost) {
    errors.push('Could not parse hostname from HOUZEZ_STAGING_DATABASE_URL.');
    return { ok: false, errors };
  }

  pushDirectHostErrors(errors, urlHost, authorizedHost, 'Staging');

  if (checkpointUrl) {
    const checkpointHost = extractHostnameFromDatabaseUrl(checkpointUrl);
    if (checkpointHost && checkpointHost === urlHost) {
      errors.push(
        'Staging host must differ from checkpoint host (refusing same endpoint).',
      );
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    connectionUrl: stagingUrl,
    dbHost: urlHost,
    dbHostMasked: maskDbHost(urlHost),
    cleanupTarget: STAGING_CLEANUP_TARGET,
    requiresLiveNeonIdentityCheck: false,
  };
}

function validateProductionCleanup(env: SafetyEnv): CleanupSafetyGateResult {
  const errors: string[] = [];
  const productionUrl = env.houzezProductionDatabaseUrl?.trim();
  const checkpointUrl = env.houzezCheckpointDatabaseUrl?.trim();
  const authorizedHost = env.houzezProductionDbHost?.trim();
  const projectId = env.houzezProductionNeonProjectId?.trim();
  const branchId = env.houzezProductionNeonBranchId?.trim();
  const endpointId = env.houzezProductionNeonEndpointId?.trim();

  if (!productionUrl) {
    errors.push(
      'HOUZEZ_PRODUCTION_DATABASE_URL is required for cleanup target production (never reuse staging URL).',
    );
  }
  if (!authorizedHost) {
    errors.push(
      'HOUZEZ_PRODUCTION_DB_HOST is required for cleanup target production.',
    );
  }
  if (!projectId || !branchId || !endpointId) {
    errors.push(
      'HOUZEZ_PRODUCTION_NEON_* identity env vars are required for production cleanup.',
    );
  } else if (
    projectId !== PRODUCTION_NEON_IDENTITY.projectId ||
    branchId !== PRODUCTION_NEON_IDENTITY.branchId ||
    endpointId !== PRODUCTION_NEON_IDENTITY.endpointId
  ) {
    errors.push(
      'HOUZEZ_PRODUCTION_NEON_* values do not match the audited production identity.',
    );
  }

  if (!productionUrl || !authorizedHost) {
    return { ok: false, errors };
  }

  if (checkpointUrl && productionUrl === checkpointUrl) {
    errors.push(
      'HOUZEZ_PRODUCTION_DATABASE_URL must not equal HOUZEZ_CHECKPOINT_DATABASE_URL.',
    );
  }
  if (env.houzezStagingDatabaseUrl?.trim() === productionUrl) {
    errors.push(
      'HOUZEZ_PRODUCTION_DATABASE_URL must not equal HOUZEZ_STAGING_DATABASE_URL.',
    );
  }

  const urlHost = extractHostnameFromDatabaseUrl(productionUrl);
  if (!urlHost) {
    errors.push(
      'Could not parse hostname from HOUZEZ_PRODUCTION_DATABASE_URL.',
    );
    return { ok: false, errors };
  }

  pushDirectHostErrors(errors, urlHost, authorizedHost, 'Production');

  if (checkpointUrl) {
    const checkpointHost = extractHostnameFromDatabaseUrl(checkpointUrl);
    if (checkpointHost && checkpointHost === urlHost) {
      errors.push(
        'Production host must differ from checkpoint host (refusing same endpoint).',
      );
    }
  }

  const stagingHost = env.houzezStagingDbHost?.trim();
  if (stagingHost && stagingHost === authorizedHost) {
    errors.push(
      'HOUZEZ_PRODUCTION_DB_HOST must differ from HOUZEZ_STAGING_DB_HOST.',
    );
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    connectionUrl: productionUrl,
    dbHost: urlHost,
    dbHostMasked: maskDbHost(urlHost),
    cleanupTarget: PRODUCTION_CLEANUP_TARGET,
    requiresLiveNeonIdentityCheck: true,
  };
}

/**
 * Hard safety gates for cleanup connectivity.
 * Never falls back to DATABASE_URL or HOUZEZ_CHECKPOINT_DATABASE_URL as destination.
 */
export function validateCleanupSafetyEnv(
  env: SafetyEnv,
): CleanupSafetyGateResult {
  const cleanupTarget = env.houzezCleanupTarget?.trim();

  if (!cleanupTarget || !isHouzezCleanupTarget(cleanupTarget)) {
    return {
      ok: false,
      errors: [
        `HOUZEZ_CLEANUP_TARGET must be exactly "${STAGING_CLEANUP_TARGET}" or "${PRODUCTION_CLEANUP_TARGET}".`,
      ],
    };
  }

  if (cleanupTarget === STAGING_CLEANUP_TARGET) {
    return validateStagingCleanup(env);
  }

  // Align naming: production cleanup target string matches migration production target.
  if (cleanupTarget !== PRODUCTION_MIGRATION_TARGET) {
    return {
      ok: false,
      errors: [
        `HOUZEZ_CLEANUP_TARGET production value must be "${PRODUCTION_CLEANUP_TARGET}".`,
      ],
    };
  }

  return validateProductionCleanup(env);
}

export function readSafetyEnvFromProcess(
  env: NodeJS.ProcessEnv = process.env,
): SafetyEnv {
  return {
    houzezStagingDatabaseUrl: env.HOUZEZ_STAGING_DATABASE_URL,
    houzezCheckpointDatabaseUrl: env.HOUZEZ_CHECKPOINT_DATABASE_URL,
    houzezStagingDbHost: env.HOUZEZ_STAGING_DB_HOST,
    houzezProductionDatabaseUrl: env.HOUZEZ_PRODUCTION_DATABASE_URL,
    houzezProductionDbHost: env.HOUZEZ_PRODUCTION_DB_HOST,
    houzezProductionNeonProjectId: env.HOUZEZ_PRODUCTION_NEON_PROJECT_ID,
    houzezProductionNeonBranchId: env.HOUZEZ_PRODUCTION_NEON_BRANCH_ID,
    houzezProductionNeonEndpointId: env.HOUZEZ_PRODUCTION_NEON_ENDPOINT_ID,
    houzezCleanupTarget: env.HOUZEZ_CLEANUP_TARGET,
    databaseUrl: env.DATABASE_URL,
  };
}
