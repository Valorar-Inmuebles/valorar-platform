import { REQUIRED_MIGRATION_TARGET } from '../constants';
import { extractHostnameFromDatabaseUrl, maskDbHost } from './db-host';

export type MigrationSafetyGateResult =
  | {
      ok: true;
      connectionUrl: string;
      dbHost: string;
      dbHostMasked: string;
      migrationTarget: typeof REQUIRED_MIGRATION_TARGET;
    }
  | { ok: false; errors: string[] };

export type MigrationSafetyEnv = {
  houzezStagingDatabaseUrl?: string;
  houzezCheckpointDatabaseUrl?: string;
  houzezStagingDbHost?: string;
  houzezMigrationTarget?: string;
  /** Compared for host ambiguity only — never used as connection target. */
  databaseUrl?: string;
};

/**
 * Hard safety gates for Houzez migration CLI DB access.
 * Never falls back to DATABASE_URL or HOUZEZ_CHECKPOINT_DATABASE_URL.
 * Distinct from cleanup: requires HOUZEZ_MIGRATION_TARGET (not HOUZEZ_CLEANUP_TARGET).
 */
export function validateMigrationSafetyEnv(
  env: MigrationSafetyEnv,
): MigrationSafetyGateResult {
  const errors: string[] = [];

  const stagingUrl = env.houzezStagingDatabaseUrl?.trim();
  const checkpointUrl = env.houzezCheckpointDatabaseUrl?.trim();
  const authorizedHost = env.houzezStagingDbHost?.trim();
  const migrationTarget = env.houzezMigrationTarget?.trim();
  const databaseUrl = env.databaseUrl?.trim();

  if (!migrationTarget) {
    errors.push(
      `HOUZEZ_MIGRATION_TARGET is required and must be exactly "${REQUIRED_MIGRATION_TARGET}".`,
    );
  } else if (migrationTarget !== REQUIRED_MIGRATION_TARGET) {
    errors.push(
      `HOUZEZ_MIGRATION_TARGET must be exactly "${REQUIRED_MIGRATION_TARGET}" (received a non-matching value).`,
    );
  }

  if (!stagingUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL is required (DATABASE_URL is never used as migration destination or fallback).',
    );
  }

  if (!authorizedHost) {
    errors.push(
      'HOUZEZ_STAGING_DB_HOST is required (full authorized staging hostname; must match URL host exactly).',
    );
  }

  if (
    !stagingUrl ||
    !authorizedHost ||
    migrationTarget !== REQUIRED_MIGRATION_TARGET
  ) {
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

  if (urlHost.includes('-pooler')) {
    errors.push(
      'Refusing pooled connection: staging host must be direct (no "-pooler").',
    );
  }

  if (authorizedHost.includes('-pooler')) {
    errors.push(
      'HOUZEZ_STAGING_DB_HOST must not contain "-pooler" (direct endpoint required).',
    );
  }

  if (urlHost !== authorizedHost) {
    errors.push(
      `Staging URL host does not match HOUZEZ_STAGING_DB_HOST (masked url=${maskDbHost(urlHost)}, masked allowlist=${maskDbHost(authorizedHost)}).`,
    );
  }

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
    migrationTarget: REQUIRED_MIGRATION_TARGET,
  };
}

export function readMigrationSafetyEnvFromProcess(
  env: NodeJS.ProcessEnv = process.env,
): MigrationSafetyEnv {
  return {
    houzezStagingDatabaseUrl: env.HOUZEZ_STAGING_DATABASE_URL,
    houzezCheckpointDatabaseUrl: env.HOUZEZ_CHECKPOINT_DATABASE_URL,
    houzezStagingDbHost: env.HOUZEZ_STAGING_DB_HOST,
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
};
