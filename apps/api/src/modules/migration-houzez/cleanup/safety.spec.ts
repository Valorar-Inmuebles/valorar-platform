import { PRODUCTION_CLEANUP_TARGET, STAGING_CLEANUP_TARGET } from './constants';
import { PRODUCTION_NEON_IDENTITY } from '../constants';
import {
  extractHostnameFromDatabaseUrl,
  maskDbHost,
  validateCleanupSafetyEnv,
} from './safety';

describe('cleanup safety gates', () => {
  const stagingHost = 'ep-example-staging.sa-east-1.aws.neon.tech';
  const productionHost = 'ep-mute-sun-ac6nva0v.sa-east-1.aws.neon.tech';
  const checkpointHost = 'ep-example-checkpoint.sa-east-1.aws.neon.tech';
  const stagingUrl = `postgresql://neondb_owner:secret@${stagingHost}/neondb?sslmode=require`;
  const productionUrl = `postgresql://neondb_owner:secret@${productionHost}/neondb?sslmode=require`;
  const checkpointUrl = `postgresql://neondb_owner:secret@${checkpointHost}/neondb?sslmode=require`;

  const validProduction = {
    houzezProductionDatabaseUrl: productionUrl,
    houzezProductionDbHost: productionHost,
    houzezProductionNeonProjectId: PRODUCTION_NEON_IDENTITY.projectId,
    houzezProductionNeonBranchId: PRODUCTION_NEON_IDENTITY.branchId,
    houzezProductionNeonEndpointId: PRODUCTION_NEON_IDENTITY.endpointId,
    houzezCheckpointDatabaseUrl: checkpointUrl,
    houzezStagingDatabaseUrl: stagingUrl,
    houzezStagingDbHost: stagingHost,
    houzezCleanupTarget: PRODUCTION_CLEANUP_TARGET,
  };

  it('masks hosts without leaking full identity casually', () => {
    const masked = maskDbHost(stagingHost);
    expect(masked).not.toBe(stagingHost);
    expect(masked).toContain('***');
    expect(masked).toContain('neon.tech');
  });

  it('extracts hostname from postgres URL', () => {
    expect(extractHostnameFromDatabaseUrl(stagingUrl)).toBe(stagingHost);
  });

  it('accepts valid staging configuration', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezCheckpointDatabaseUrl: checkpointUrl,
      houzezStagingDbHost: stagingHost,
      houzezCleanupTarget: STAGING_CLEANUP_TARGET,
      databaseUrl: `postgresql://neondb_owner:secret@other-host/neondb`,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dbHost).toBe(stagingHost);
      expect(result.connectionUrl).toBe(stagingUrl);
      expect(result.cleanupTarget).toBe(STAGING_CLEANUP_TARGET);
      expect(result.requiresLiveNeonIdentityCheck).toBe(false);
    }
  });

  it('accepts valid production configuration', () => {
    const result = validateCleanupSafetyEnv(validProduction);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dbHost).toBe(productionHost);
      expect(result.connectionUrl).toBe(productionUrl);
      expect(result.cleanupTarget).toBe(PRODUCTION_CLEANUP_TARGET);
      expect(result.requiresLiveNeonIdentityCheck).toBe(true);
    }
  });

  it('refuses production cleanup with staging-only env', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezStagingDbHost: stagingHost,
      houzezCleanupTarget: PRODUCTION_CLEANUP_TARGET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_PRODUCTION_DATABASE_URL/i.test(e)),
      ).toBe(true);
    }
  });

  it('refuses production cleanup with wrong neon identity', () => {
    const result = validateCleanupSafetyEnv({
      ...validProduction,
      houzezProductionNeonProjectId: 'wrong-project',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /audited production identity/i.test(e)),
      ).toBe(true);
    }
  });

  it('refuses missing staging URL (no DATABASE_URL fallback)', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDbHost: stagingHost,
      houzezCleanupTarget: STAGING_CLEANUP_TARGET,
      databaseUrl: stagingUrl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /HOUZEZ_STAGING_DATABASE_URL/i.test(e)),
      ).toBe(true);
    }
  });

  it('refuses pooler hosts', () => {
    const pooled = `postgresql://u:p@ep-x-pooler.sa-east-1.aws.neon.tech/neondb`;
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: pooled,
      houzezStagingDbHost: 'ep-x-pooler.sa-east-1.aws.neon.tech',
      houzezCleanupTarget: STAGING_CLEANUP_TARGET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /pooler/i.test(e))).toBe(true);
    }
  });

  it('refuses host mismatch against allowlist', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezStagingDbHost: 'ep-other.sa-east-1.aws.neon.tech',
      houzezCleanupTarget: STAGING_CLEANUP_TARGET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /does not match/i.test(e))).toBe(true);
    }
  });

  it('refuses wrong cleanup target', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezStagingDbHost: stagingHost,
      houzezCleanupTarget: 'prod',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses unknown cleanup target main', () => {
    const result = validateCleanupSafetyEnv({
      ...validProduction,
      houzezCleanupTarget: 'main',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging URL identical to checkpoint URL', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezCheckpointDatabaseUrl: stagingUrl,
      houzezStagingDbHost: stagingHost,
      houzezCleanupTarget: STAGING_CLEANUP_TARGET,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging host equal to checkpoint host', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezCheckpointDatabaseUrl: `postgresql://u:p@${stagingHost}/neondb`,
      houzezStagingDbHost: stagingHost,
      houzezCleanupTarget: STAGING_CLEANUP_TARGET,
    });
    expect(result.ok).toBe(false);
  });

  it('refuses staging URL identical to DATABASE_URL', () => {
    const result = validateCleanupSafetyEnv({
      houzezStagingDatabaseUrl: stagingUrl,
      houzezStagingDbHost: stagingHost,
      houzezCleanupTarget: STAGING_CLEANUP_TARGET,
      databaseUrl: stagingUrl,
    });
    expect(result.ok).toBe(false);
  });
});
