import {
  PRODUCTION_MIGRATION_TARGET,
  PRODUCTION_NEON_IDENTITY,
  STAGING_MIGRATION_TARGET,
} from '../constants';
import {
  readMigrationSafetyEnvFromProcess,
  validateMigrationSafetyEnv,
} from './migration-safety';
import { maskDbHost } from './db-host';

describe('migration safety gates', () => {
  const stagingHost = 'ep-example-staging.sa-east-1.aws.neon.tech';
  const productionHost = 'ep-mute-sun-ac6nva0v.sa-east-1.aws.neon.tech';
  const checkpointHost = 'ep-example-checkpoint.sa-east-1.aws.neon.tech';
  const databaseHost = 'ep-example-database.sa-east-1.aws.neon.tech';
  const stagingUrl = `postgresql://neondb_owner:secret@${stagingHost}/neondb?sslmode=require`;
  const productionUrl = `postgresql://neondb_owner:secret@${productionHost}/neondb?sslmode=require`;
  const checkpointUrl = `postgresql://neondb_owner:secret@${checkpointHost}/neondb?sslmode=require`;
  const databaseUrl = `postgresql://neondb_owner:secret@${databaseHost}/neondb?sslmode=require`;

  const validStaging = {
    houzezStagingDatabaseUrl: stagingUrl,
    houzezCheckpointDatabaseUrl: checkpointUrl,
    houzezStagingDbHost: stagingHost,
    houzezMigrationTarget: STAGING_MIGRATION_TARGET,
    databaseUrl,
  };

  const validProduction = {
    houzezProductionDatabaseUrl: productionUrl,
    houzezProductionDbHost: productionHost,
    houzezProductionNeonProjectId: PRODUCTION_NEON_IDENTITY.projectId,
    houzezProductionNeonBranchId: PRODUCTION_NEON_IDENTITY.branchId,
    houzezProductionNeonEndpointId: PRODUCTION_NEON_IDENTITY.endpointId,
    houzezCheckpointDatabaseUrl: checkpointUrl,
    houzezStagingDatabaseUrl: stagingUrl,
    houzezStagingDbHost: stagingHost,
    houzezMigrationTarget: PRODUCTION_MIGRATION_TARGET,
    databaseUrl,
  };

  it('accepts valid staging migration configuration', () => {
    const result = validateMigrationSafetyEnv(validStaging);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrationTarget).toBe(STAGING_MIGRATION_TARGET);
      expect(result.dbHost).toBe(stagingHost);
      expect(result.connectionUrl).toBe(stagingUrl);
      expect(result.requiresLiveNeonIdentityCheck).toBe(false);
      expect(result.dbHostMasked).toContain('***');
      expect(result.dbHostMasked).not.toContain('secret');
    }
  });

  it('accepts valid production migration configuration', () => {
    const result = validateMigrationSafetyEnv(validProduction);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrationTarget).toBe(PRODUCTION_MIGRATION_TARGET);
      expect(result.dbHost).toBe(productionHost);
      expect(result.connectionUrl).toBe(productionUrl);
      expect(result.requiresLiveNeonIdentityCheck).toBe(true);
    }
  });

  it('refuses missing migration target', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezMigrationTarget: undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_MIGRATION_TARGET/i.test(e)),
      ).toBe(true);
    }
  });

  it('refuses unknown migration target', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezMigrationTarget: 'main',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses production target with staging-only env', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezMigrationTarget: PRODUCTION_MIGRATION_TARGET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_PRODUCTION_DATABASE_URL/i.test(e)),
      ).toBe(true);
    }
  });

  it('refuses production with wrong neon identity ids', () => {
    const result = validateMigrationSafetyEnv({
      ...validProduction,
      houzezProductionNeonProjectId: 'wrong-project',
      houzezProductionNeonBranchId: 'br-wrong',
      houzezProductionNeonEndpointId: 'ep-wrong',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /project identity/i.test(e))).toBe(true);
      expect(result.errors.some((e) => /branch identity/i.test(e))).toBe(true);
      expect(result.errors.some((e) => /endpoint identity/i.test(e))).toBe(
        true,
      );
    }
  });

  it('refuses staging target when production URL is used instead of staging URL', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezStagingDatabaseUrl: undefined,
      houzezProductionDatabaseUrl: productionUrl,
      houzezProductionDbHost: productionHost,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_STAGING_DATABASE_URL/i.test(e)),
      ).toBe(true);
      expect(result.errors.some((e) => /never used/i.test(e))).toBe(true);
    }
  });

  it('does not accept HOUZEZ_CLEANUP_TARGET as substitute', () => {
    const result = validateMigrationSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezStagingDbHost: stagingHost,
      houzezMigrationTarget: undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_MIGRATION_TARGET/i.test(e)),
      ).toBe(true);
    }
  });

  it('refuses missing staging URL (no DATABASE_URL fallback)', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezStagingDatabaseUrl: undefined,
      databaseUrl: stagingUrl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_STAGING_DATABASE_URL/i.test(e)),
      ).toBe(true);
      expect(result.errors.some((e) => /never used/i.test(e))).toBe(true);
    }
  });

  it('refuses missing host allowlist', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezStagingDbHost: undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /HOUZEZ_STAGING_DB_HOST/i.test(e))).toBe(
        true,
      );
    }
  });

  it('refuses hostname mismatch against allowlist', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezStagingDbHost: 'ep-other.sa-east-1.aws.neon.tech',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /does not match/i.test(e))).toBe(true);
      expect(result.errors.join('\n')).not.toContain('secret');
      expect(result.errors.join('\n')).toContain(maskDbHost(stagingHost));
    }
  });

  it('refuses pooler hosts', () => {
    const pooledHost = 'ep-x-pooler.sa-east-1.aws.neon.tech';
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezStagingDatabaseUrl: `postgresql://u:p@${pooledHost}/neondb`,
      houzezStagingDbHost: pooledHost,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /pooler/i.test(e))).toBe(true);
    }
  });

  it('refuses staging URL identical to checkpoint URL', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezCheckpointDatabaseUrl: stagingUrl,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging host equal to checkpoint host', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezCheckpointDatabaseUrl: `postgresql://u:p@${stagingHost}/neondb`,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging URL identical to DATABASE_URL', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      databaseUrl: stagingUrl,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging host equal to DATABASE_URL host (different credentials)', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      databaseUrl: `postgresql://other:creds@${stagingHost}/neondb`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /DATABASE_URL host/i.test(e))).toBe(
        true,
      );
      expect(result.errors.join('\n')).not.toContain('creds');
    }
  });

  it('refuses invalid staging URL that cannot yield a hostname', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      houzezStagingDatabaseUrl: 'not-a-url',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /invalid URL|parse hostname/i.test(e)),
      ).toBe(true);
    }
  });

  it('allows missing DATABASE_URL when staging is otherwise valid', () => {
    const result = validateMigrationSafetyEnv({
      ...validStaging,
      databaseUrl: undefined,
    });
    expect(result.ok).toBe(true);
  });

  it('readMigrationSafetyEnvFromProcess maps HOUZEZ_MIGRATION_TARGET (not cleanup)', () => {
    const env = readMigrationSafetyEnvFromProcess({
      HOUZEZ_STAGING_DATABASE_URL: stagingUrl,
      HOUZEZ_STAGING_DB_HOST: stagingHost,
      HOUZEZ_MIGRATION_TARGET: 'staging-houzez',
      HOUZEZ_CLEANUP_TARGET: 'staging-houzez',
      DATABASE_URL: databaseUrl,
    });
    expect(env.houzezMigrationTarget).toBe('staging-houzez');
    expect(
      (env as { houzezCleanupTarget?: string }).houzezCleanupTarget,
    ).toBeUndefined();
  });

  it('readMigrationSafetyEnvFromProcess maps production env vars', () => {
    const env = readMigrationSafetyEnvFromProcess({
      HOUZEZ_PRODUCTION_DATABASE_URL: productionUrl,
      HOUZEZ_PRODUCTION_DB_HOST: productionHost,
      HOUZEZ_PRODUCTION_NEON_PROJECT_ID: PRODUCTION_NEON_IDENTITY.projectId,
      HOUZEZ_PRODUCTION_NEON_BRANCH_ID: PRODUCTION_NEON_IDENTITY.branchId,
      HOUZEZ_PRODUCTION_NEON_ENDPOINT_ID: PRODUCTION_NEON_IDENTITY.endpointId,
      HOUZEZ_MIGRATION_TARGET: PRODUCTION_MIGRATION_TARGET,
    });
    expect(env.houzezProductionDatabaseUrl).toBe(productionUrl);
    expect(env.houzezProductionNeonProjectId).toBe(
      PRODUCTION_NEON_IDENTITY.projectId,
    );
  });
});
