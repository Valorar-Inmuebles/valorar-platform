/**
 * Developments data migration CLI — audit / dry-run / preflight / import.
 *
 * Import is fail-closed to an explicit development target. It uses DATABASE_URL
 * and STORAGE_* from apps/api/.env after proving they are not production,
 * staging or preview.
 *
 * Usage (from apps/api):
 *   npm run migration:developments -- audit
 *   npm run migration:developments -- dry-run
 *   npm run migration:developments -- preflight --target=development
 *   npm run migration:developments -- import --target=development --tenant=demo --confirm=IMPORT_LOCAL_DEVELOPMENTS
 *
 * From repo root:
 *   npm run migration:developments -w api -- preflight --target=development
 */
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { S3Client } from '@aws-sdk/client-s3';
import { parseCliArgs } from '../src/modules/migration-developments/cli/parse-args';
import {
  exitCodeForAudit,
  exitCodeForDryRun,
  exitCodeForImport,
  exitCodeForPreflight,
  formatAuditReport,
  formatDryRunReport,
  formatImportReport,
  formatPreflightReport,
} from '../src/modules/migration-developments/cli/format-report';
import { runAudit } from '../src/modules/migration-developments/cli/run-audit';
import { runDryRun } from '../src/modules/migration-developments/cli/run-dry-run';
import { runImport } from '../src/modules/migration-developments/cli/run-import';
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
  DEFAULT_TENANT_SLUG,
  IMPORT_CONFIRM_TOKEN,
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
  import      Idempotent write (requires --target=development and confirm token)

Options:
  --source-path=PATH   Source directory (default: migration-data/emprendimientos)
  --target=development Required for preflight/import
  --confirm=${IMPORT_CONFIRM_TOKEN}
  --tenant=demo        Tenant slug (default: ${DEFAULT_TENANT_SLUG})
  --created-by=EMAIL   Optional creator email
  --json               Print JSON instead of the text summary

Import refuses production, prod, staging and preview.
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
  const sourcePath = resolveSourcePath(options.sourcePath);

  if (options.command === 'audit') {
    const report = runAudit(sourcePath, options.tenantId);
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : `${formatAuditReport(report)}\n`,
    );
    process.exit(exitCodeForAudit(report));
  }

  if (options.command === 'dry-run') {
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
  const dryRun = runDryRun(sourcePath, { tenantId: options.tenantId });
  const migrationsDir = defaultMigrationsDir();

  const shared = {
    plans: dryRun.developments,
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

  if (!databaseUrl) {
    process.stderr.write(
      'DATABASE_URL is required for preflight and import.\n',
    );
    process.exit(1);
  }

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
