/**
 * Houzez migration CLI — audit / dry-run / single-property import.
 *
 * DB access requires:
 *   HOUZEZ_STAGING_DATABASE_URL
 *   HOUZEZ_STAGING_DB_HOST
 *   HOUZEZ_MIGRATION_TARGET=staging-houzez
 *
 * Never uses DATABASE_URL as destination or fallback.
 *
 * Usage:
 *   npx tsx scripts/houzez-migrate.ts audit --source-dir <path> --report-dir <path>
 *   npx tsx scripts/houzez-migrate.ts dry-run --wp-id=5312 --tenant=demo --owner-email=admin@demo.valorar.dev
 *   npx tsx scripts/houzez-migrate.ts import --wp-id=5312 --tenant=demo --owner-email=... --source-dir=... --dry-run-report=... --confirm-target=staging-houzez --confirm-write=IMPORT_ONE_HOUZEZ_PROPERTY
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { S3Client } from '@aws-sdk/client-s3';
import {
  DEFAULT_OWNER_EMAIL,
  DEFAULT_TENANT_SLUG,
  IMPORT_CONFIRM_TARGET,
  IMPORT_CONFIRM_WRITE,
  PILOT_WP_ID,
  REQUIRED_MIGRATION_TARGET,
} from '../src/modules/migration-houzez/constants';
import {
  DatasetManifestValidationError,
  ImportValidationError,
  runAudit,
  runDryRun,
  runImport,
  type CliOptions,
  type ImportCliOptions,
} from '../src/modules/migration-houzez/services/houzez-runner.service';
import {
  readMigrationSafetyEnvFromProcess,
  validateMigrationSafetyEnv,
  type MigrationSafetyReport,
} from '../src/modules/migration-houzez/safety/migration-safety';
import { parseImportCliArgs } from '../src/modules/migration-houzez/writer/import-cli-args';
import { createS3MigrationObjectStore } from '../src/modules/migration-houzez/writer/s3-migration-object-store';
import type { MigrationObjectStore } from '../src/modules/migration-houzez/writer/migration-object-store';
import type { WriterPrisma } from '../src/modules/migration-houzez/writer/houzez-property-writer';
import { getStorageConfig } from '../src/modules/storage/storage.config';

type Args = Record<string, string | boolean>;

type PrismaBundle = {
  prisma: object;
  pool: { end: () => Promise<void> };
};

function parseArgs(argv: string[]): { command: string; args: Args } {
  const [command = 'help', ...rest] = argv;
  const args: Args = {};
  const positionals: string[] = [];
  for (const token of rest) {
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf('=');
    if (eq === -1) {
      args[body] = true;
    } else {
      args[body.slice(0, eq)] = body.slice(eq + 1);
    }
  }
  if (!args['source-dir'] && positionals[0])
    args['source-dir'] = positionals[0];
  if (!args['report-dir'] && positionals[1])
    args['report-dir'] = positionals[1];
  return { command, args };
}

function resolveDefaultSourceDir(): string {
  const candidates = [
    process.env.MIGRATION_DATA_DIR,
    path.resolve(process.cwd(), '../../migration-data'),
    path.resolve(process.cwd(), 'migration-data'),
    path.resolve(process.cwd(), '../../../valorar-platform/migration-data'),
    'C:/cursor/valorar-platform/migration-data',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'valorar-houzez-001.sql'))) return c;
  }
  return candidates[0] ?? path.resolve(process.cwd(), '../../migration-data');
}

function loadApiEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
}

/**
 * Create Prisma client with an already-validated staging connection URL.
 * Never reads process.env.DATABASE_URL.
 */
function createStagingPrismaClient(connectionUrl: string): PrismaBundle {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const { PrismaClient } = require('../generated/prisma/client');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const { PrismaPg } = require('@prisma/adapter-pg');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const { Pool } = require('pg');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const pool = new Pool({ connectionString: connectionUrl });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return {
    prisma: prisma as object,
    pool: pool as { end: () => Promise<void> },
  };
}

async function disconnectPrisma(bundle: PrismaBundle | null) {
  if (!bundle) return;
  const client = bundle.prisma as {
    $disconnect?: () => Promise<void>;
  };
  try {
    await client.$disconnect?.();
  } catch {
    /* ignore */
  }
  try {
    await bundle.pool.end();
  } catch {
    /* ignore */
  }
}

function createConfiguredObjectStore(): MigrationObjectStore {
  // Reuse the same STORAGE_* contract as apps/api StorageModule (no parallel R2 config).
  const config = getStorageConfig();

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return createS3MigrationObjectStore({
    client,
    bucket: config.bucket,
    publicUrlBase: config.publicUrl,
  });
}

function printHelp() {
  console.log(`Houzez migration CLI

Commands:
  audit      Stream-dump audit report (validates dataset manifest; no DB)
  dry-run    Plan transform for one WP property (default --wp-id=${PILOT_WP_ID})
  import     Write exactly one property (requires dual confirmations + approved dry-run)

Options (audit/dry-run):
  --source-dir=PATH     Folder with valorar-houzez-00N.sql + uploads/
  --report-dir=PATH     Output JSON reports (default migration-data/reports)
  --tenant=SLUG         Tenant slug (default ${DEFAULT_TENANT_SLUG})
  --owner-email=EMAIL   Owner email (default ${DEFAULT_OWNER_EMAIL})
  --wp-id=ID            WordPress property ID for dry-run
  --statuses=a,b        Optional status allow-list (protected; publish recommended)
  --batch-id=ID         Optional batch id
  --skip-db             Skip staging DB lookups (audit/dry-run only; refused by import)

Import-required options (no defaults for identity):
  --wp-id=ID
  --tenant=SLUG
  --owner-email=EMAIL
  --source-dir=PATH
  --dry-run-report=PATH
  --confirm-target=${IMPORT_CONFIRM_TARGET}
  --confirm-write=${IMPORT_CONFIRM_WRITE}

DB access (dry-run/import without --skip-db) requires env:
  HOUZEZ_STAGING_DATABASE_URL   direct Neon endpoint (no -pooler)
  HOUZEZ_STAGING_DB_HOST        full hostname allowlist (must match URL host)
  HOUZEZ_MIGRATION_TARGET=${REQUIRED_MIGRATION_TARGET}

DATABASE_URL is never used as migration destination or fallback.
HOUZEZ_CLEANUP_TARGET is not used by this CLI.
`);
}

function resolveStagingDbOrExit(): {
  bundle: PrismaBundle;
  safety: MigrationSafetyReport;
} | null {
  loadApiEnv();
  const gates = validateMigrationSafetyEnv(readMigrationSafetyEnvFromProcess());
  if (!gates.ok) {
    for (const err of gates.errors) {
      console.error(err);
    }
    console.error(
      `Aborting before any DB connection (target must be ${REQUIRED_MIGRATION_TARGET}).`,
    );
    process.exitCode = 2;
    return null;
  }

  try {
    const bundle = createStagingPrismaClient(gates.connectionUrl);
    return {
      bundle,
      safety: {
        migrationTarget: gates.migrationTarget,
        dbHostMasked: gates.dbHostMasked,
        gatesSatisfied: true,
        dbAccessEnabled: true,
        skipDb: false,
      },
    };
  } catch (error) {
    console.error(
      'Failed to create staging Prisma client:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 2;
    return null;
  }
}

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2));
  if (command === 'help' || args.help) {
    printHelp();
    return;
  }

  if (command === 'write') {
    console.error(
      'Use "import" (not "write"). Import requires dual confirmations and an approved dry-run report.',
    );
    process.exitCode = 2;
    return;
  }

  if (command === 'import') {
    const parsed = parseImportCliArgs({ args });
    if (!parsed.ok) {
      for (const err of parsed.errors) console.error(err);
      process.exitCode = 2;
      return;
    }

    let bundle: PrismaBundle | null = null;
    try {
      const resolved = resolveStagingDbOrExit();
      if (!resolved) return;
      bundle = resolved.bundle;

      const objectStore = createConfiguredObjectStore();
      const options: ImportCliOptions = {
        mode: 'import',
        sourceDir: parsed.sourceDir,
        reportDir: parsed.reportDir,
        tenantSlug: parsed.tenantSlug,
        ownerEmail: parsed.ownerEmail,
        wpId: parsed.wpId,
        statuses: parsed.statuses,
        batchId: parsed.batchId,
        skipDb: false,
        safety: resolved.safety,
        dryRunReportPath: parsed.dryRunReportPath,
        confirmTarget: parsed.confirmTarget,
        confirmWrite: parsed.confirmWrite,
      };

      const report = await runImport(
        options,
        bundle.prisma as WriterPrisma,
        objectStore,
      );
      console.log(
        JSON.stringify(
          {
            mode: report.mode,
            wpId: report.wpId,
            wrote: report.wrote,
            propertyId: report.propertyId,
            domainEntityCount: report.domainEntityCount,
            controlEntityCount: report.controlEntityCount,
            blockers: report.blockers,
            error: report.error,
            compensation: {
              uploadedKeys: report.compensation.uploadedKeys.length,
              compensatedKeys: report.compensation.compensatedKeys.length,
              pendingKeys: report.compensation.pendingKeys.length,
              compensationFailed: report.compensation.compensationFailed,
            },
            dryRunFingerprint: report.dryRunFingerprint,
            wouldWrite: true,
          },
          null,
          2,
        ),
      );
      if (!report.wrote || report.blockers.length) process.exitCode = 1;
    } catch (error) {
      if (error instanceof DatasetManifestValidationError) {
        console.error(error.message);
        process.exitCode = 2;
        return;
      }
      if (error instanceof ImportValidationError) {
        for (const err of error.errors) console.error(err);
        process.exitCode = 2;
        return;
      }
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    } finally {
      await disconnectPrisma(bundle);
    }
    return;
  }

  const sourceDir = String(args['source-dir'] || resolveDefaultSourceDir());
  const reportDir = String(
    args['report-dir'] || path.join(sourceDir, 'reports'),
  );

  const options: CliOptions = {
    mode: command === 'dry-run' ? 'dry-run' : 'audit',
    sourceDir,
    reportDir,
    tenantSlug: String(args.tenant || DEFAULT_TENANT_SLUG),
    ownerEmail: String(args['owner-email'] || DEFAULT_OWNER_EMAIL),
    wpId: args['wp-id'] ? Number(args['wp-id']) : PILOT_WP_ID,
    statuses: args.statuses
      ? String(args.statuses)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    batchId: args['batch-id'] ? String(args['batch-id']) : undefined,
    skipDb: Boolean(args['skip-db']),
  };

  if (command === 'audit') {
    try {
      const report = await runAudit(options);
      console.log(
        JSON.stringify(
          {
            mode: report.mode,
            reportFile: path.join(reportDir, 'houzez-audit.json'),
            datasetManifest: report.datasetManifest,
            propertyCountByStatus: report.dump.propertyCountByStatus,
            permalink: report.dump.permalink,
            galleryLimitBlocked: report.dump.galleryLimitBlocked,
            wouldWrite: false,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      if (error instanceof DatasetManifestValidationError) {
        console.error(error.message);
        process.exitCode = 2;
        return;
      }
      throw error;
    }
    return;
  }

  if (command === 'dry-run') {
    if (options.statuses && !options.statuses.includes('publish')) {
      console.error(
        'Refusing dry-run: --statuses does not include publish (protected for this phase).',
      );
      process.exitCode = 2;
      return;
    }
    if (!options.statuses) options.statuses = ['publish'];

    let bundle: PrismaBundle | null = null;
    if (options.skipDb) {
      options.safety = {
        migrationTarget: null,
        dbHostMasked: null,
        gatesSatisfied: false,
        dbAccessEnabled: false,
        skipDb: true,
      };
    } else {
      const resolved = resolveStagingDbOrExit();
      if (!resolved) return;
      bundle = resolved.bundle;
      options.safety = resolved.safety;
    }

    try {
      const report = await runDryRun(options, bundle?.prisma ?? null);
      console.log(
        JSON.stringify(
          {
            mode: report.mode,
            reportFile: path.join(
              reportDir,
              `houzez-dry-run-${report.wpId}.json`,
            ),
            wpId: report.wpId,
            batchId: report.batchId,
            reportFingerprint: report.reportFingerprint,
            safety: report.safety,
            datasetManifest: {
              manifestId: report.datasetManifest.manifestId,
              ok: report.datasetManifest.ok,
            },
            ownerOk: report.owner.ok,
            blockers: report.blockers,
            warnings: report.warnings,
            preflight: {
              performed: report.preflight.performed,
              propertyTreeEmpty: report.preflight.propertyTreeEmpty,
              migrationSourceRefExists:
                report.preflight.migrationSourceRefExists,
              pilotBlockers: report.preflight.pilotBlockers,
              importBlockers: report.preflight.importBlockers,
            },
            imageSummary: report.imageSummary,
            oldUrl: report.oldUrl,
            catalogs: report.catalogs.map((c) => ({
              key: c.key,
              status: c.status,
              detail: c.detail,
            })),
            plannedEntityCount: report.plannedEntities.length,
            idempotency: {
              idempotencySchemaAvailable:
                report.idempotency.idempotencySchemaAvailable,
              idempotencyDbCheckPerformed:
                report.idempotency.idempotencyDbCheckPerformed,
              note: report.idempotency.note,
            },
            wouldWrite: false,
          },
          null,
          2,
        ),
      );
      if (report.blockers.length) process.exitCode = 1;
    } catch (error) {
      if (error instanceof DatasetManifestValidationError) {
        console.error(error.message);
        process.exitCode = 2;
        return;
      }
      throw error;
    } finally {
      await disconnectPrisma(bundle);
    }
    return;
  }

  printHelp();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
