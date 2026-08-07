import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Architectural guard: migrate CLI must never open Prisma with DATABASE_URL.
 */
describe('migrate CLI isolation', () => {
  const scriptPath = path.resolve(
    __dirname,
    '../../../../scripts/houzez-migrate.ts',
  );

  it('never passes process.env.DATABASE_URL into Pool/Prisma', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    expect(source).toMatch(/createStagingPrismaClient\(connectionUrl/);
    expect(source).toMatch(/validateMigrationSafetyEnv/);
    expect(source).toMatch(/HOUZEZ_MIGRATION_TARGET/);
    expect(source).toMatch(/connectionString:\s*connectionUrl/);
    expect(source).not.toMatch(
      /new Pool\(\{\s*connectionString:\s*process\.env\.DATABASE_URL/,
    );
    expect(source).not.toMatch(
      /connectionString:\s*process\.env\.DATABASE_URL/,
    );
    // Cleanup target may appear in help as "not used"; must not be read from env.
    expect(source).not.toMatch(/env\.HOUZEZ_CLEANUP_TARGET/);
    expect(source).not.toMatch(/HOUZEZ_CLEANUP_TARGET\s*=/);
  });

  it('--skip-db path does not call validateMigrationSafetyEnv before connect', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    const skipIdx = source.indexOf('if (options.skipDb)');
    const resolveIdx = source.indexOf('resolveStagingDbOrExit');
    expect(skipIdx).toBeGreaterThan(-1);
    expect(resolveIdx).toBeGreaterThan(-1);
    // skip-db branch appears before resolveStagingDbOrExit usage in dry-run
    const dryRunIdx = source.indexOf("command === 'dry-run'");
    expect(dryRunIdx).toBeGreaterThan(-1);
    const skipInDryRun = source.indexOf('if (options.skipDb)', dryRunIdx);
    const resolveInDryRun = source.indexOf(
      'resolveStagingDbOrExit()',
      dryRunIdx,
    );
    expect(skipInDryRun).toBeGreaterThan(-1);
    expect(resolveInDryRun).toBeGreaterThan(skipInDryRun);
  });

  it('import/write remain disabled and wouldWrite stays false in console summary', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    expect(source).toMatch(/Write\/import mode is disabled/);
    expect(source).toMatch(/wouldWrite:\s*false/);
  });
});

describe('dry-run report path sanitization', () => {
  const runnerPath = path.resolve(__dirname, 'houzez-runner.service.ts');

  it('nulls absolutePath and shortens sourceDir before persisting reports', () => {
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toMatch(/sanitizeImagesForReport/);
    expect(source).toMatch(/sanitizeSourceDirForReport/);
    expect(source).toMatch(/absolutePath:\s*null/);
  });
});
