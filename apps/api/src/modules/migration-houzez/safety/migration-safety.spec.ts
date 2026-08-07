import {
  readMigrationSafetyEnvFromProcess,
  validateMigrationSafetyEnv,
} from './migration-safety';
import { maskDbHost } from './db-host';

describe('migration safety gates', () => {
  const stagingHost = 'ep-example-staging.sa-east-1.aws.neon.tech';
  const checkpointHost = 'ep-example-checkpoint.sa-east-1.aws.neon.tech';
  const databaseHost = 'ep-example-database.sa-east-1.aws.neon.tech';
  const stagingUrl = `postgresql://neondb_owner:secret@${stagingHost}/neondb?sslmode=require`;
  const checkpointUrl = `postgresql://neondb_owner:secret@${checkpointHost}/neondb?sslmode=require`;
  const databaseUrl = `postgresql://neondb_owner:secret@${databaseHost}/neondb?sslmode=require`;

  const valid = {
    houzezStagingDatabaseUrl: stagingUrl,
    houzezCheckpointDatabaseUrl: checkpointUrl,
    houzezStagingDbHost: stagingHost,
    houzezMigrationTarget: 'staging-houzez' as const,
    databaseUrl,
  };

  it('accepts valid staging migration configuration', () => {
    const result = validateMigrationSafetyEnv(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrationTarget).toBe('staging-houzez');
      expect(result.dbHost).toBe(stagingHost);
      expect(result.connectionUrl).toBe(stagingUrl);
      expect(result.dbHostMasked).toContain('***');
      expect(result.dbHostMasked).not.toContain('secret');
    }
  });

  it('refuses missing migration target', () => {
    const result = validateMigrationSafetyEnv({
      ...valid,
      houzezMigrationTarget: undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_MIGRATION_TARGET/i.test(e)),
      ).toBe(true);
    }
  });

  it('refuses incorrect migration target', () => {
    const result = validateMigrationSafetyEnv({
      ...valid,
      houzezMigrationTarget: 'production',
    });
    expect(result.ok).toBe(false);
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
      ...valid,
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
      ...valid,
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
      ...valid,
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
      ...valid,
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
      ...valid,
      houzezCheckpointDatabaseUrl: stagingUrl,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging host equal to checkpoint host', () => {
    const result = validateMigrationSafetyEnv({
      ...valid,
      houzezCheckpointDatabaseUrl: `postgresql://u:p@${stagingHost}/neondb`,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging URL identical to DATABASE_URL', () => {
    const result = validateMigrationSafetyEnv({
      ...valid,
      databaseUrl: stagingUrl,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging host equal to DATABASE_URL host (different credentials)', () => {
    const result = validateMigrationSafetyEnv({
      ...valid,
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
      ...valid,
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
      ...valid,
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
});
