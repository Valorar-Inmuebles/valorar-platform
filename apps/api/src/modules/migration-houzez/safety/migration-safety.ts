import {
  PRODUCTION_MIGRATION_TARGET,
  PRODUCTION_NEON_IDENTITY,
  STAGING_MIGRATION_TARGET,
  isHouzezMigrationTarget,
  type HouzezMigrationTarget,
} from '../constants';
import { extractHostnameFromDatabaseUrl, maskDbHost } from './db-host';

export type MigrationSafetyGateResult =
  | {
      ok: true;
      connectionUrl: string;
      dbHost: string;
      dbHostMasked: string;
      migrationTarget: HouzezMigrationTarget;
      requiresLiveNeonIdentityCheck: boolean;
    }
  | { ok: false; errors: string[] };

export type MigrationSafetyEnv = {
  houzezStagingDatabaseUrl?: string;
  houzezCheckpointDatabaseUrl?: string;
  houzezStagingDbHost?: string;
  houzezProductionDatabaseUrl?: string;
  houzezProductionDbHost?: string;
  houzezProductionNeonProjectId?: string;
  houzezProductionNeonBranchId?: string;
  houzezProductionNeonEndpointId?: string;
  houzezMigrationTarget?: string;
  /** Compared for host ambiguity — never used as connection target. */
  databaseUrl?: string;
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

function validateStagingGates(
  env: MigrationSafetyEnv,
): MigrationSafetyGateResult {
  const errors: string[] = [];
  const stagingUrl = env.houzezStagingDatabaseUrl?.trim();
  const checkpointUrl = env.houzezCheckpointDatabaseUrl?.trim();
  const authorizedHost = env.houzezStagingDbHost?.trim();
  const databaseUrl = env.databaseUrl?.trim();

  if (!stagingUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL is required for target staging-houzez (DATABASE_URL is never used as migration destination or fallback).',
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
      'HOUZEZ_STAGING_DATABASE_URL must not be identical to DATABASE_URL (migration never uses DATABASE_URL).',
    );
  }

  const urlHost = extractHostnameFromDatabaseUrl(stagingUrl);
  if (!urlHost) {
    errors.push(
      'Could not parse hostname from HOUZEZ_STAGING_DATABASE_URL (invalid URL).',
    );
    return { ok: false, errors };
  }

  pushDirectHostErrors(errors, urlHost, authorizedHost, 'Staging');

  if (checkpointUrl) {
    const checkpointHost = extractHostnameFromDatabaseUrl(checkpointUrl);
    if (!checkpointHost) {
      errors.push(
        'HOUZEZ_CHECKPOINT_DATABASE_URL is set but hostname could not be parsed (cannot prove staging ≠ checkpoint).',
      );
    } else if (checkpointHost === urlHost) {
      errors.push(
        `Staging host must differ from checkpoint host (masked=${maskDbHost(urlHost)}).`,
      );
    }
  }

  if (databaseUrl) {
    const databaseHost = extractHostnameFromDatabaseUrl(databaseUrl);
    if (!databaseHost) {
      errors.push(
        'DATABASE_URL is set but hostname could not be parsed (cannot prove staging ≠ ordinary connection).',
      );
    } else if (databaseHost === urlHost) {
      errors.push(
        `Staging host must differ from DATABASE_URL host (masked=${maskDbHost(urlHost)}; migration never uses DATABASE_URL).`,
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
    migrationTarget: STAGING_MIGRATION_TARGET,
    requiresLiveNeonIdentityCheck: false,
  };
}

function validateProductionGates(
  env: MigrationSafetyEnv,
): MigrationSafetyGateResult {
  const errors: string[] = [];
  const productionUrl = env.houzezProductionDatabaseUrl?.trim();
  const checkpointUrl = env.houzezCheckpointDatabaseUrl?.trim();
  const authorizedHost = env.houzezProductionDbHost?.trim();
  const projectId = env.houzezProductionNeonProjectId?.trim();
  const branchId = env.houzezProductionNeonBranchId?.trim();
  const endpointId = env.houzezProductionNeonEndpointId?.trim();

  if (!productionUrl) {
    errors.push(
      'HOUZEZ_PRODUCTION_DATABASE_URL is required for target production (never reuse HOUZEZ_STAGING_DATABASE_URL; DATABASE_URL is never the migration destination).',
    );
  }
  if (!authorizedHost) {
    errors.push(
      'HOUZEZ_PRODUCTION_DB_HOST is required (full authorized production hostname; must match URL host exactly).',
    );
  }

  if (!projectId || !branchId || !endpointId) {
    errors.push(
      'HOUZEZ_PRODUCTION_NEON_PROJECT_ID, HOUZEZ_PRODUCTION_NEON_BRANCH_ID, and HOUZEZ_PRODUCTION_NEON_ENDPOINT_ID are required and must match the E.5 audited production identity.',
    );
  } else {
    if (projectId !== PRODUCTION_NEON_IDENTITY.projectId) {
      errors.push(
        'HOUZEZ_PRODUCTION_NEON_PROJECT_ID does not match the audited production project identity.',
      );
    }
    if (branchId !== PRODUCTION_NEON_IDENTITY.branchId) {
      errors.push(
        'HOUZEZ_PRODUCTION_NEON_BRANCH_ID does not match the audited production branch identity.',
      );
    }
    if (endpointId !== PRODUCTION_NEON_IDENTITY.endpointId) {
      errors.push(
        'HOUZEZ_PRODUCTION_NEON_ENDPOINT_ID does not match the audited production endpoint identity.',
      );
    }
  }

  if (!productionUrl || !authorizedHost) {
    return { ok: false, errors };
  }

  if (env.houzezStagingDatabaseUrl?.trim() === productionUrl) {
    errors.push(
      'HOUZEZ_PRODUCTION_DATABASE_URL must not equal HOUZEZ_STAGING_DATABASE_URL.',
    );
  }

  if (checkpointUrl && productionUrl === checkpointUrl) {
    errors.push(
      'HOUZEZ_PRODUCTION_DATABASE_URL must not equal HOUZEZ_CHECKPOINT_DATABASE_URL.',
    );
  }

  const urlHost = extractHostnameFromDatabaseUrl(productionUrl);
  if (!urlHost) {
    errors.push(
      'Could not parse hostname from HOUZEZ_PRODUCTION_DATABASE_URL (invalid URL).',
    );
    return { ok: false, errors };
  }

  pushDirectHostErrors(errors, urlHost, authorizedHost, 'Production');

  if (checkpointUrl) {
    const checkpointHost = extractHostnameFromDatabaseUrl(checkpointUrl);
    if (!checkpointHost) {
      errors.push(
        'HOUZEZ_CHECKPOINT_DATABASE_URL is set but hostname could not be parsed (cannot prove production ≠ checkpoint).',
      );
    } else if (checkpointHost === urlHost) {
      errors.push(
        `Production host must differ from checkpoint host (masked=${maskDbHost(urlHost)}).`,
      );
    }
  }

  // Refuse silently using staging host allowlist for production.
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
    migrationTarget: PRODUCTION_MIGRATION_TARGET,
    requiresLiveNeonIdentityCheck: true,
  };
}

/**
 * Hard safety gates for Houzez migration CLI DB access.
 * Never falls back to DATABASE_URL or HOUZEZ_CHECKPOINT_DATABASE_URL as destination.
 * Supports staging-houzez (existing) and production (dedicated env + Neon fingerprint).
 */
export function validateMigrationSafetyEnv(
  env: MigrationSafetyEnv,
): MigrationSafetyGateResult {
  const migrationTarget = env.houzezMigrationTarget?.trim();

  if (!migrationTarget) {
    return {
      ok: false,
      errors: [
        `HOUZEZ_MIGRATION_TARGET is required and must be exactly "${STAGING_MIGRATION_TARGET}" or "${PRODUCTION_MIGRATION_TARGET}".`,
      ],
    };
  }

  if (!isHouzezMigrationTarget(migrationTarget)) {
    return {
      ok: false,
      errors: [
        `HOUZEZ_MIGRATION_TARGET must be exactly "${STAGING_MIGRATION_TARGET}" or "${PRODUCTION_MIGRATION_TARGET}" (received a non-matching value).`,
      ],
    };
  }

  if (migrationTarget === STAGING_MIGRATION_TARGET) {
    return validateStagingGates(env);
  }

  return validateProductionGates(env);
}

export function readMigrationSafetyEnvFromProcess(
  env: NodeJS.ProcessEnv = process.env,
): MigrationSafetyEnv {
  return {
    houzezStagingDatabaseUrl: env.HOUZEZ_STAGING_DATABASE_URL,
    houzezCheckpointDatabaseUrl: env.HOUZEZ_CHECKPOINT_DATABASE_URL,
    houzezStagingDbHost: env.HOUZEZ_STAGING_DB_HOST,
    houzezProductionDatabaseUrl: env.HOUZEZ_PRODUCTION_DATABASE_URL,
    houzezProductionDbHost: env.HOUZEZ_PRODUCTION_DB_HOST,
    houzezProductionNeonProjectId: env.HOUZEZ_PRODUCTION_NEON_PROJECT_ID,
    houzezProductionNeonBranchId: env.HOUZEZ_PRODUCTION_NEON_BRANCH_ID,
    houzezProductionNeonEndpointId: env.HOUZEZ_PRODUCTION_NEON_ENDPOINT_ID,
    houzezMigrationTarget: env.HOUZEZ_MIGRATION_TARGET,
    databaseUrl: env.DATABASE_URL,
  };
}

/** Report-safe safety summary (no URLs / secrets). */
export type MigrationSafetyReport = {
  migrationTarget: string | null;
  dbHostMasked: string | null;
  gatesSatisfied: boolean;
  dbAccessEnabled: boolean;
  skipDb: boolean;
  neonIdentityVerified?: boolean | null;
};
