/**
 * Controlled production upgrade of pilot WP 5312 images to houzez-webp-v2.
 *
 * Uploads NEW versioned R2 keys for attachments 5315 and 5314 only,
 * updates exactly two PropertyImage rows in one transaction, retains v1 keys.
 *
 * Never uses the general import command. Never uses DATABASE_URL as destination.
 *
 * Usage (from apps/api):
 *   npx tsx scripts/houzez-upgrade-pilot-images.ts \
 *     --wp-id=5312 --tenant=demo --owner-email=admin@demo.valorar.dev \
 *     --approved-manifest=../../migration-data/prepared/wp-5312/2026-08-11T21-00-33-562Z/preparation-manifest.json \
 *     --confirm-target=production \
 *     --confirm-write=UPGRADE_PILOT_IMAGES_WEBP_V2_PRODUCTION \
 *     --execute
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { S3Client } from '@aws-sdk/client-s3';
import {
  PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION,
  PILOT_WP_ID,
  PRODUCTION_MIGRATION_TARGET,
} from '../src/modules/migration-houzez/constants';
import {
  readMigrationSafetyEnvFromProcess,
  validateMigrationSafetyEnv,
} from '../src/modules/migration-houzez/safety/migration-safety';
import { parsePilotImageUpgradeArgs } from '../src/modules/migration-houzez/upgrade/parse-args';
import {
  runPilotImageUpgrade,
  type UpgradePrisma,
} from '../src/modules/migration-houzez/upgrade/pilot-image-upgrade';
import { createS3MigrationObjectStore } from '../src/modules/migration-houzez/writer/s3-migration-object-store';
import { getStorageConfig } from '../src/modules/storage/storage.config';

type PrismaBundle = {
  prisma: object;
  pool: { end: () => Promise<void> };
};

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (const token of argv) {
    if (!token.startsWith('--')) continue;
    const body = token.slice(2);
    const eq = body.indexOf('=');
    if (eq === -1) args[body] = true;
    else args[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return args;
}

function loadApiEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
}

function createPrismaClient(connectionUrl: string): PrismaBundle {
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
  const client = bundle.prisma as { $disconnect?: () => Promise<void> };
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

function createConfiguredObjectStore() {
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
  console.log(`Houzez pilot image upgrade (WP ${PILOT_WP_ID} only)

Required:
  --wp-id=${PILOT_WP_ID}
  --tenant=demo
  --owner-email=admin@demo.valorar.dev
  --approved-manifest=PATH
  --confirm-target=${PRODUCTION_MIGRATION_TARGET}
  --confirm-write=${PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION}

Optional:
  --report-dir=PATH
  --execute                 Perform R2 PutObject + DB transaction (otherwise preflight only)

Env (production gates — DATABASE_URL is never the destination):
  HOUZEZ_MIGRATION_TARGET=${PRODUCTION_MIGRATION_TARGET}
  HOUZEZ_PRODUCTION_DATABASE_URL / HOUZEZ_PRODUCTION_DB_HOST
  HOUZEZ_PRODUCTION_NEON_PROJECT_ID / BRANCH_ID / ENDPOINT_ID
  STORAGE_* (R2)
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const parsed = parsePilotImageUpgradeArgs({ args });
  if (!parsed.ok) {
    for (const err of parsed.errors) console.error(err);
    process.exitCode = 2;
    return;
  }

  loadApiEnv();
  // Force production target for this specialized CLI.
  if (process.env.HOUZEZ_MIGRATION_TARGET !== PRODUCTION_MIGRATION_TARGET) {
    console.error(
      `HOUZEZ_MIGRATION_TARGET must be exactly "${PRODUCTION_MIGRATION_TARGET}" for pilot image upgrade.`,
    );
    process.exitCode = 2;
    return;
  }

  const gates = validateMigrationSafetyEnv(readMigrationSafetyEnvFromProcess());
  if (!gates.ok) {
    for (const err of gates.errors) console.error(err);
    process.exitCode = 2;
    return;
  }
  if (gates.migrationTarget !== PRODUCTION_MIGRATION_TARGET) {
    console.error(
      'Pilot image upgrade refuses non-production migration target.',
    );
    process.exitCode = 2;
    return;
  }

  let bundle: PrismaBundle | null = null;
  try {
    bundle = createPrismaClient(gates.connectionUrl);
    const objectStore = createConfiguredObjectStore();
    const report = await runPilotImageUpgrade({
      prisma: bundle.prisma as UpgradePrisma,
      objectStore,
      approvedManifestPath: path.resolve(parsed.approvedManifestPath),
      execute: parsed.execute,
      tenantSlug: parsed.tenantSlug,
      ownerEmail: parsed.ownerEmail,
    });

    const reportDir = path.resolve(parsed.reportDir);
    fs.mkdirSync(reportDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      reportDir,
      `houzez-pilot-image-upgrade-5312-${stamp}.json`,
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(
      JSON.stringify(
        {
          verdict: report.verdict,
          executed: report.executed,
          rowsUpdated: report.rowsUpdated,
          startedAtUtc: report.startedAtUtc,
          finishedAtUtc: report.finishedAtUtc,
          reportPath,
          blockers: report.blockers,
          warnings: report.warnings,
        },
        null,
        2,
      ),
    );

    if (report.verdict !== 'PILOT_IMAGE_UPGRADE_COMPLETED_AND_VERIFIED') {
      process.exitCode =
        report.verdict === 'BLOCKED' && !parsed.execute ? 0 : 1;
      if (
        report.verdict === 'BLOCKED' &&
        !parsed.execute &&
        report.blockers.length === 1
      ) {
        // Preflight-only without --execute is a successful dry gate when the only
        // blocker is the missing --execute flag.
        const onlyExecute =
          report.blockers[0]?.includes('--execute was not provided') === true;
        process.exitCode = onlyExecute ? 0 : 1;
      }
    }
  } catch (error) {
    console.error(
      'Pilot image upgrade failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    await disconnectPrisma(bundle);
  }
}

void main();
