/**
 * Developments data migration CLI — audit / dry-run / preflight / import / cleanup.
 *
 * Import is fail-closed. Development target requires a development identity.
 * Production target requires --confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION and
 * only authorizes the audited Neon, bucket valorarinmuebles-images-prod,
 * tenant demo and sourceSystem local-developments-v1.
 *
 * Usage (from apps/api):
 *   npm run migration:developments -- audit
 *   npm run migration:developments -- dry-run
 *   npm run migration:developments -- preflight --target=development
 *   npm run migration:developments -- import --target=development --tenant=demo --confirm=IMPORT_LOCAL_DEVELOPMENTS
 *   npm run migration:developments -- import --target=production --tenant=demo --created-by=admin@demo.valorar.dev --confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION
 *   npm run migration:developments -- cleanup --dry-run --target=production --tenant=demo
 *   npm run migration:developments -- cleanup --execute --target=production --tenant=demo --confirm=DELETE_LOCAL_DEVELOPMENTS_PRODUCTION
 *
 * From repo root:
 *   npm run migration:developments -w api -- preflight --target=production
 */
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { S3Client } from '@aws-sdk/client-s3';
import { parseCliArgs } from '../src/modules/migration-developments/cli/parse-args';
import {
  exitCodeForAudit,
  exitCodeForCleanup,
  exitCodeForDryRun,
  exitCodeForImport,
  exitCodeForPreflight,
  formatAuditReport,
  formatCleanupReport,
  formatDryRunReport,
  formatImportReport,
  formatPreflightReport,
} from '../src/modules/migration-developments/cli/format-report';
import { runAudit } from '../src/modules/migration-developments/cli/run-audit';
import { runDryRun } from '../src/modules/migration-developments/cli/run-dry-run';
import { runImport } from '../src/modules/migration-developments/cli/run-import';
import { runCleanup } from '../src/modules/migration-developments/cleanup/run-cleanup';
import { resolveSourcePath } from '../src/modules/migration-developments/path/repo-root';
import {
  defaultMigrationsDir,
  runPreflight,
} from '../src/modules/migration-developments/preflight/run-preflight';
import { createS3MigrationObjectStore } from '../src/modules/migration-developments/writer/s3-object-store';
import {
  getStorageConfig,
  isStorageConfigured,
} from '../src/modules/storage/storage.config';
import {
  ALLOWED_MIGRATION_TARGET,
  CLEANUP_PRODUCTION_CONFIRM_TOKEN,
  DEFAULT_TENANT_SLUG,
  IMPORT_CONFIRM_TOKEN,
  IMPORT_PRODUCTION_CONFIRM_TOKEN,
} from '../src/modules/migration-developments/constants';

type PrismaBundle = {
  prisma: object;
  pool: { end: () => Promise<void> };
};

function printHelp(): void {
  process.stdout.write(`Developments migration

Commands:
  audit       Inventory of folders, TXT files and images
  dry-run     Full import plan without database or storage writes
  preflight   Read-only environment, catalog and conflict checks
  import      Idempotent write (requires --target and confirm token)
  cleanup     Delete only this lote (--dry-run or --execute)

Options:
  --source-path=PATH   Source directory (default: migration-data/emprendimientos)
  --target=development Required for preflight/import/cleanup
  --target=production  Explicit authorized destination (confirm token required)
  --confirm=${IMPORT_CONFIRM_TOKEN}
  --confirm=${IMPORT_PRODUCTION_CONFIRM_TOKEN}
  --confirm=${CLEANUP_PRODUCTION_CONFIRM_TOKEN}
  --tenant=demo        Tenant slug (default: ${DEFAULT_TENANT_SLUG})
  --created-by=EMAIL   Optional creator email
  --dry-run            Cleanup counts only
  --execute            Cleanup writes (requires confirm)
  --json               Print JSON instead of the text summary

Development target still refuses prod/staging/preview identities.
Production target only authorizes the audited Neon, bucket valorarinmuebles-images-prod, tenant demo and sourceSystem local-developments-v1.
`);
}

function argvWithNpmConfigPassthrough(argv: string[]): string[] {
  const next = [...argv];
  if (
    !next.some(
      (token) => token === '--target' || token.startsWith('--target='),
    ) &&
    process.env.npm_config_target
  ) {
    next.push(`--target=${process.env.npm_config_target}`);
  }
  if (
    !next.some(
      (token) => token === '--confirm' || token.startsWith('--confirm='),
    ) &&
    process.env.npm_config_confirm
  ) {
    next.push(`--confirm=${process.env.npm_config_confirm}`);
  }
  if (
    !next.some(
      (token) => token === '--tenant' || token.startsWith('--tenant='),
    ) &&
    process.env.npm_config_tenant
  ) {
    next.push(`--tenant=${process.env.npm_config_tenant}`);
  }
  if (
    !next.some(
      (token) => token === '--created-by' || token.startsWith('--created-by='),
    ) &&
    process.env.npm_config_created_by
  ) {
    next.push(`--created-by=${process.env.npm_config_created_by}`);
  }
  if (
    !next.some(
      (token) => token === '--dry-run' || token.startsWith('--dry-run='),
    ) &&
    process.env.npm_config_dry_run
  ) {
    next.push('--dry-run');
  }
  if (
    !next.some(
      (token) => token === '--execute' || token.startsWith('--execute='),
    ) &&
    process.env.npm_config_execute
  ) {
    next.push('--execute');
  }
  return next;
}

function loadApiEnv(): void {
  loadEnv({ path: path.resolve(process.cwd(), '.env') });
}

function createPrismaClient(connectionUrl: string): PrismaBundle {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  const { PrismaClient } = require('../generated/prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: connectionUrl }) as {
    end: () => Promise<void>;
  };
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) }) as object;
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  return { prisma, pool };
}

function createObjectStore() {
  if (!isStorageConfigured()) {
    return null;
  }
  const storage = getStorageConfig();
  const client = new S3Client({
    region: storage.region,
    endpoint: storage.endpoint,
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
  });
  return createS3MigrationObjectStore({
    client,
    bucket: storage.bucket,
    publicUrlBase: storage.publicUrl,
  });
}

async function withPrisma<T>(
  connectionUrl: string,
  fn: (prisma: object) => Promise<T>,
): Promise<T> {
  const bundle = createPrismaClient(connectionUrl);
  try {
    return await fn(bundle.prisma);
  } finally {
    await bundle.pool.end();
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help') {
    printHelp();
    process.exit(0);
  }

  const options = parseCliArgs(argvWithNpmConfigPassthrough(argv));

  if (options.command === 'audit') {
    const sourcePath = resolveSourcePath(options.sourcePath);
    const report = runAudit(sourcePath, options.tenantId);
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : `${formatAuditReport(report)}\n`,
    );
    process.exit(exitCodeForAudit(report));
  }

  if (options.command === 'dry-run') {
    const sourcePath = resolveSourcePath(options.sourcePath);
    const report = runDryRun(sourcePath, { tenantId: options.tenantId });
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : `${formatDryRunReport(report)}\n`,
    );
    process.exit(exitCodeForDryRun(report));
  }

  loadApiEnv();
  const databaseUrl = process.env.DATABASE_URL;
  const storage = isStorageConfigured() ? getStorageConfig() : null;
  const objectStore = createObjectStore();
  const migrationsDir = defaultMigrationsDir();

  if (!databaseUrl) {
    process.stderr.write(
      'DATABASE_URL is required for preflight, import and cleanup.\n',
    );
    process.exit(1);
  }

  const envShared = {
    target: options.target ?? ALLOWED_MIGRATION_TARGET,
    tenantSlug: options.tenant ?? DEFAULT_TENANT_SLUG,
    createdBy: options.createdBy,
    databaseUrl,
    storageBucket: storage?.bucket,
    storageEndpoint: storage?.endpoint,
    storagePublicUrl: storage?.publicUrl,
    allowedDbHost: process.env.DEVELOPMENTS_DEV_DB_HOST,
    allowedStorageBucket: process.env.DEVELOPMENTS_DEV_STORAGE_BUCKET,
    migrationsDir,
  };

  if (options.command === 'cleanup') {
    if (!objectStore) {
      process.stderr.write('Storage is not configured. Cleanup refused.\n');
      process.exit(1);
    }
    const report = await withPrisma(databaseUrl, (prisma) =>
      runCleanup({
        ...envShared,
        prisma: prisma as never,
        objectStore,
        dryRun: options.dryRun === true,
        confirm: options.confirm,
      }),
    );
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : `${formatCleanupReport(report)}\n`,
    );
    process.exit(exitCodeForCleanup(report));
  }

  const sourcePath = resolveSourcePath(options.sourcePath);
  const dryRun = runDryRun(sourcePath, { tenantId: options.tenantId });
  const shared = {
    ...envShared,
    plans: dryRun.developments,
  };

  if (options.command === 'preflight') {
    const report = await withPrisma(databaseUrl, (prisma) =>
      runPreflight({
        ...shared,
        prisma: prisma as never,
        objectStore,
        confirm: options.confirm,
        requireConfirm: false,
      }),
    );
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : `${formatPreflightReport(report)}\n`,
    );
    process.exit(exitCodeForPreflight(report));
  }

  if (!objectStore) {
    process.stderr.write('Storage is not configured. Import refused.\n');
    process.exit(1);
  }

  const report = await withPrisma(databaseUrl, (prisma) =>
    runImport({
      ...shared,
      prisma: prisma as never,
      objectStore,
      confirm: options.confirm ?? '',
      batchId: randomUUID(),
    }),
  );
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatImportReport(report)}\n`,
  );
  process.exit(exitCodeForImport(report));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
