import * as fs from 'node:fs';
import * as path from 'node:path';
import { IMPORT_CONFIRM_TARGET, IMPORT_CONFIRM_WRITE } from '../constants';

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
    expect(source).not.toMatch(/env\.HOUZEZ_CLEANUP_TARGET/);
    expect(source).not.toMatch(/HOUZEZ_CLEANUP_TARGET\s*=/);
  });

  it('--skip-db path does not call validateMigrationSafetyEnv before connect', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
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

  it('import requires dual confirmations and dry-run binding; audit/dry-run stay wouldWrite false', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    expect(source).toMatch(/parseImportCliArgs/);
    expect(source).toMatch(/runImport/);
    expect(source).toContain(IMPORT_CONFIRM_WRITE);
    expect(source).toContain(IMPORT_CONFIRM_TARGET);
    expect(source).toMatch(/dry-run-report/);
    expect(source).toMatch(/wouldWrite:\s*false/);
    // write alias remains rejected
    expect(source).toMatch(/Use "import" \(not "write"\)/);
  });

  it('import path refuses DATABASE_URL and constructs store only after gates', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    const importIdx = source.indexOf("command === 'import'");
    expect(importIdx).toBeGreaterThan(-1);
    const importSlice = source.slice(importIdx, importIdx + 2500);
    expect(importSlice).toMatch(/resolveStagingDbOrExit/);
    expect(importSlice).toMatch(/createConfiguredObjectStore/);
    expect(importSlice).not.toMatch(/process\.env\.DATABASE_URL/);
  });
});

describe('dry-run report path sanitization', () => {
  const runnerPath = path.resolve(__dirname, 'houzez-runner.service.ts');

  it('nulls absolutePath and shortens sourceDir before persisting reports', () => {
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toMatch(/sanitizeImagesForReport/);
    expect(source).toMatch(/sanitizeSourceDirForReport/);
    expect(source).toMatch(/absolutePath:\s*null/);
    expect(source).toMatch(/computeDryRunFingerprint/);
    expect(source).toMatch(/reportFingerprint/);
  });

  it('audit and dry-run exports never set wouldWrite true', () => {
    const source = fs.readFileSync(runnerPath, 'utf8');
    expect(source).toMatch(/wouldWrite:\s*false/);
    // import report uses wouldWrite: true only inside ImportReport type path
    expect(source).toMatch(/export async function runImport/);
  });
});
