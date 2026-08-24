import {
  ALLOWED_MIGRATION_TARGET,
  AUDITED_PRODUCTION_NEON_IDENTITY,
  AUTHORIZED_PRODUCTION_STORAGE_BUCKET,
  IMPORT_CONFIRM_TOKEN,
  IMPORT_PRODUCTION_CONFIRM_TOKEN,
  PRODUCTION_MIGRATION_TARGET,
} from '../constants';
import {
  assertAllowedTarget,
  assertImportConfirm,
  validateDevelopmentEnvironment,
} from './environment';

const DEV_NEON = {
  projectId: 'dev-project',
  branchId: 'br-dev-branch',
  endpointId: 'ep-dev-endpoint',
};

describe('development environment gates', () => {
  it('rejects a target other than development or production', () => {
    expect(assertAllowedTarget('prod').ok).toBe(false);
    expect(assertAllowedTarget('staging').ok).toBe(false);
    expect(assertAllowedTarget('preview').ok).toBe(false);
    expect(assertAllowedTarget('development').ok).toBe(true);
    expect(assertAllowedTarget('production').ok).toBe(true);
  });

  it('rejects a missing import confirmation token', () => {
    expect(assertImportConfirm(undefined).ok).toBe(false);
    expect(assertImportConfirm('').ok).toBe(false);
    expect(assertImportConfirm('YES').ok).toBe(false);
    expect(assertImportConfirm(IMPORT_CONFIRM_TOKEN).ok).toBe(true);
    expect(
      assertImportConfirm(IMPORT_CONFIRM_TOKEN, PRODUCTION_MIGRATION_TARGET).ok,
    ).toBe(false);
    expect(
      assertImportConfirm(
        IMPORT_PRODUCTION_CONFIRM_TOKEN,
        PRODUCTION_MIGRATION_TARGET,
      ).ok,
    ).toBe(true);
  });

  it('refuses the audited production Neon identity even with target=development', () => {
    const result = validateDevelopmentEnvironment({
      target: ALLOWED_MIGRATION_TARGET,
      confirm: IMPORT_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-dev-branch.aws.neon.tech/neondb',
      storageBucket: 'valorar-images-dev',
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: AUDITED_PRODUCTION_NEON_IDENTITY,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.blockers.some(
          (issue) => issue.code === 'NEON_PRODUCTION_IDENTITY',
        ),
      ).toBe(true);
    }
  });

  it('refuses a storage bucket with a prod token on development target', () => {
    const result = validateDevelopmentEnvironment({
      target: ALLOWED_MIGRATION_TARGET,
      confirm: IMPORT_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-dev-branch.aws.neon.tech/neondb',
      storageBucket: AUTHORIZED_PRODUCTION_STORAGE_BUCKET,
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: DEV_NEON,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.blockers.some(
          (issue) => issue.code === 'STORAGE_NOT_DEVELOPMENT',
        ),
      ).toBe(true);
    }
  });

  it('accepts an unambiguously development host and bucket', () => {
    const result = validateDevelopmentEnvironment({
      target: ALLOWED_MIGRATION_TARGET,
      confirm: IMPORT_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-dev-branch.aws.neon.tech/neondb',
      storageBucket: 'valorar-images-dev',
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: DEV_NEON,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects production target without the production confirm token', () => {
    const result = validateDevelopmentEnvironment({
      target: PRODUCTION_MIGRATION_TARGET,
      confirm: IMPORT_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-mute-sun-ac6nva0v.aws.neon.tech/neondb',
      storageBucket: AUTHORIZED_PRODUCTION_STORAGE_BUCKET,
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: AUDITED_PRODUCTION_NEON_IDENTITY,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.blockers.some(
          (issue) => issue.code === 'IMPORT_CONFIRM_REQUIRED',
        ),
      ).toBe(true);
    }
  });

  it('rejects production target against a non-authorized bucket', () => {
    const result = validateDevelopmentEnvironment({
      target: PRODUCTION_MIGRATION_TARGET,
      confirm: IMPORT_PRODUCTION_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-mute-sun-ac6nva0v.aws.neon.tech/neondb',
      storageBucket: 'some-other-bucket-prod',
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: AUDITED_PRODUCTION_NEON_IDENTITY,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.blockers.some(
          (issue) => issue.code === 'STORAGE_NOT_AUTHORIZED_PRODUCTION',
        ),
      ).toBe(true);
    }
  });

  it('accepts the authorized production neon, bucket and confirm token', () => {
    const result = validateDevelopmentEnvironment({
      target: PRODUCTION_MIGRATION_TARGET,
      confirm: IMPORT_PRODUCTION_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-mute-sun-ac6nva0v.aws.neon.tech/neondb',
      storageBucket: AUTHORIZED_PRODUCTION_STORAGE_BUCKET,
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: AUDITED_PRODUCTION_NEON_IDENTITY,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.environment.target).toBe(PRODUCTION_MIGRATION_TARGET);
      expect(result.environment.storageBucket).toBe(
        AUTHORIZED_PRODUCTION_STORAGE_BUCKET,
      );
    }
  });
});
