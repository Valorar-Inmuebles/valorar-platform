import {
  ALLOWED_MIGRATION_TARGET,
  DENIED_PRODUCTION_NEON_IDENTITY,
  IMPORT_CONFIRM_TOKEN,
} from '../constants';
import {
  assertAllowedTarget,
  assertImportConfirm,
  validateDevelopmentEnvironment,
} from './environment';

describe('development environment gates', () => {
  it('rejects a target other than development', () => {
    expect(assertAllowedTarget('production').ok).toBe(false);
    expect(assertAllowedTarget('prod').ok).toBe(false);
    expect(assertAllowedTarget('staging').ok).toBe(false);
    expect(assertAllowedTarget('preview').ok).toBe(false);
    expect(assertAllowedTarget('development').ok).toBe(true);
  });

  it('rejects a missing import confirmation token', () => {
    expect(assertImportConfirm(undefined).ok).toBe(false);
    expect(assertImportConfirm('').ok).toBe(false);
    expect(assertImportConfirm('YES').ok).toBe(false);
    expect(assertImportConfirm(IMPORT_CONFIRM_TOKEN).ok).toBe(true);
  });

  it('refuses the audited production Neon identity even with target=development', () => {
    const result = validateDevelopmentEnvironment({
      target: ALLOWED_MIGRATION_TARGET,
      confirm: IMPORT_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-dev-branch.aws.neon.tech/neondb',
      storageBucket: 'valorar-images-dev',
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: DENIED_PRODUCTION_NEON_IDENTITY,
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

  it('refuses a storage bucket with a prod token', () => {
    const result = validateDevelopmentEnvironment({
      target: ALLOWED_MIGRATION_TARGET,
      confirm: IMPORT_CONFIRM_TOKEN,
      requireConfirm: true,
      databaseUrl: 'postgresql://u:p@ep-dev-branch.aws.neon.tech/neondb',
      storageBucket: 'valorarinmuebles-images-prod',
      storageEndpoint: 'https://account.r2.cloudflarestorage.com',
      neon: {
        projectId: 'dev-project',
        branchId: 'br-dev-branch',
        endpointId: 'ep-dev-endpoint',
      },
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
      neon: {
        projectId: 'dev-project',
        branchId: 'br-dev-branch',
        endpointId: 'ep-dev-endpoint',
      },
    });
    expect(result.ok).toBe(true);
  });
});
