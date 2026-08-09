/**
 * Controlled cleanup of demo Property tree on Houzez staging (Neon staging-houzez).
 *
 * Safe by default (no args → no-op).
 *
 *   npm run migration:houzez:cleanup-demo -- --dry-run --tenant=demo
 *   npm run migration:houzez:cleanup-demo -- --execute --tenant=demo --confirm-token=DELETE-DEMO-PROPERTIES-STAGING
 *
 * Required env:
 *   HOUZEZ_STAGING_DATABASE_URL   — direct (non-pooler) staging connection
 *   HOUZEZ_STAGING_DB_HOST        — full authorized hostname (must match URL host)
 *   HOUZEZ_CLEANUP_TARGET         — must be "staging-houzez"
 *
 * Never uses DATABASE_URL or HOUZEZ_CHECKPOINT_DATABASE_URL as the cleanup target.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { runCleanupDryRun } from '../src/modules/migration-houzez/cleanup/dry-run';
import {
  parseCleanupArgs,
  validateCleanupModeAndTenant,
} from '../src/modules/migration-houzez/cleanup/parse-args';
import { createCleanupR2Reader } from '../src/modules/migration-houzez/cleanup/r2-verify';
import {
  readSafetyEnvFromProcess,
  validateCleanupSafetyEnv,
} from '../src/modules/migration-houzez/cleanup/safety';
import type { CleanupPrisma } from '../src/modules/migration-houzez/cleanup/db';

type PrismaBundle = {
  prisma: CleanupPrisma;
  pool: { end: () => Promise<void> };
};

function loadApiEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
}

function printHelp(): void {
  console.log(`Houzez demo-property cleanup (staging-houzez | production)

Usage:
  --dry-run --tenant=demo
  --execute --tenant=demo --confirm-target=staging-houzez --confirm-token=DELETE-DEMO-PROPERTIES-STAGING --manifest=<path> --approved-hash=<sha256>
  --execute --tenant=demo --confirm-target=production --confirm-token=DELETE-DEMO-PROPERTIES-PRODUCTION --manifest=<path> --approved-hash=<sha256>

Safety:
  Default (no mode flag): refuse and exit (no remote writes).
  --dry-run: DB + R2 reads only; writes local manifest/report under backups/.
  --execute: requires confirm-target + confirm-token + approved dry-run manifesto + hash.

Env (staging):
  HOUZEZ_STAGING_DATABASE_URL / HOUZEZ_STAGING_DB_HOST
  HOUZEZ_CLEANUP_TARGET=staging-houzez

Env (production):
  HOUZEZ_PRODUCTION_DATABASE_URL / HOUZEZ_PRODUCTION_DB_HOST
  HOUZEZ_PRODUCTION_NEON_PROJECT_ID / BRANCH_ID / ENDPOINT_ID
  HOUZEZ_CLEANUP_TARGET=production

Deletes only the demo Property tree (CASCADE) + allowlisted seed R2 keys.
Preserves Tenant/User/geo/features/settings. Never deletes wordpress-houzez/5312 R2 keys.
Never falls back to DATABASE_URL. Never targets HOUZEZ_CHECKPOINT_DATABASE_URL.
`);
}

function createStagingPrisma(connectionUrl: string): PrismaBundle {
  // Dynamic requires keep the CLI runnable via tsx (same pattern as houzez-migrate.ts).
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
    prisma: prisma as CleanupPrisma,
    pool: pool as { end: () => Promise<void> },
  };
}

async function disconnectPrisma(bundle: PrismaBundle | null): Promise<void> {
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

async function main(): Promise<void> {
  loadApiEnv();

  const args = parseCleanupArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const modeResult = validateCleanupModeAndTenant(
    args,
    process.env.HOUZEZ_CLEANUP_TARGET,
  );
  if (!modeResult.ok) {
    for (const err of modeResult.errors) {
      console.error(err);
    }
    printHelp();
    process.exitCode = 2;
    return;
  }

  const safety = validateCleanupSafetyEnv(readSafetyEnvFromProcess());
  if (!safety.ok) {
    for (const err of safety.errors) {
      console.error(err);
    }
    process.exitCode = 2;
    return;
  }

  console.log(
    JSON.stringify(
      {
        phase: 'safety-ok',
        mode: modeResult.mode,
        tenant: args.tenantSlug,
        dbHostMasked: safety.dbHostMasked,
        cleanupTarget: process.env.HOUZEZ_CLEANUP_TARGET,
        remoteWritesEnabled: modeResult.mode === 'execute',
      },
      null,
      2,
    ),
  );

  const backupsRoot = path.resolve(process.cwd(), 'backups', 'houzez-cleanup');
  const tenantSlug = args.tenantSlug!;

  let bundle: PrismaBundle | null = null;

  try {
    if (modeResult.mode === 'dry-run') {
      // Dry-run path: do NOT require execute.ts or r2-delete.ts.
      // (Static imports above are read-only: dry-run + HeadObject only.)
      bundle = createStagingPrisma(safety.connectionUrl);
      const r2 = createCleanupR2Reader();
      try {
        const result = await runCleanupDryRun({
          prisma: bundle.prisma,
          r2,
          tenantSlug,
          dbHostMasked: safety.dbHostMasked,
          backupsRoot,
        });

        console.log(
          JSON.stringify(
            {
              mode: 'dry-run',
              procedureVersion: result.manifest.procedureVersion,
              ok: result.ok,
              okMeaning:
                'ok <=> dryRunCompleted && databaseCountsMatch && storageChecksCompleted && storagePolicySatisfied; not sufficient alone for execute',
              semantics: result.semantics,
              readyForExecuteNote:
                'Technical readiness only; still requires --execute, confirm token, host/target, hash, and owner authorization',
              remoteWrites: result.semantics.remoteWrites,
              dbHostMasked: safety.dbHostMasked,
              preCountsByTenant: result.manifest.preCountsByTenant,
              countDiffs: result.countDiffs,
              imageRecordCount: result.manifest.imageRecordCount,
              uniqueStorageKeyCount: result.manifest.uniqueStorageKeyCount,
              classificationSummary: result.classificationSummary,
              statusSummary: result.manifest.statusSummary,
              authorizedDeleteCount: result.authorizedDeleteCount,
              r2: result.r2Summary,
              anomalousKey: result.anomalousKey
                ? {
                    storageKey: result.anomalousKey.storageKey,
                    classification: result.anomalousKey.classification,
                    status: result.anomalousKey.status,
                    isAnomalousKey: true,
                    deleteAuthorized: false,
                    r2Exists: result.anomalousKey.r2.exists,
                    etagPresent: Boolean(result.anomalousKey.r2.etag),
                  }
                : null,
              stableHash: result.manifest.stableHash,
              outputDir: result.outputDir,
              manifestPath: result.manifestPath,
              reportPath: result.reportPath,
            },
            null,
            2,
          ),
        );

        if (!result.semantics.readyForExecute) process.exitCode = 1;
      } finally {
        r2.destroy();
      }
      return;
    }

    // Execute path — separate require; not loaded on dry-run runtime path above.
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const {
      createCleanupR2Deleter,
    } = require('../src/modules/migration-houzez/cleanup/r2-delete');
    const {
      runCleanupExecute,
    } = require('../src/modules/migration-houzez/cleanup/execute');

    const manifestPath = path.resolve(args.manifestPath!);
    const approvedHash = args.approvedHash!;
    if (!fs.existsSync(manifestPath)) {
      console.error(`Manifest file not found: ${manifestPath}`);
      process.exitCode = 2;
      return;
    }

    console.log(
      JSON.stringify(
        {
          phase: 'execute-preflight-summary',
          target: process.env.HOUZEZ_CLEANUP_TARGET,
          tenant: tenantSlug,
          propertiesExpected: 33,
          relatedExpected: {
            PropertyListing: 36,
            PropertyPrice: 38,
            PropertyImage: 129,
            PropertyFeatureAssignment: 104,
            PropertyAgentAccess: 0,
          },
          r2AuthorizedObjects: 8,
          seedNotFoundExcluded: 120,
          anomalousExcluded: 1,
          manifestPath,
          approvedHashAbbreviated: `${approvedHash.slice(0, 12)}…${approvedHash.slice(-12)}`,
          confirmTokenRequired: 'DELETE-DEMO-PROPERTIES-STAGING',
          notFoundKeysInAllowlist: false,
          note: 'Proceeding to single authorized execute against staging only.',
        },
        null,
        2,
      ),
    );

    bundle = createStagingPrisma(safety.connectionUrl);
    const r2Delete = createCleanupR2Deleter();
    const r2Head = createCleanupR2Reader();
    try {
      const result = await runCleanupExecute({
        prisma: bundle.prisma,
        r2Delete,
        r2Head,
        tenantSlug,
        manifestPath,
        approvedHash,
        dbHostMasked: safety.dbHostMasked,
        cleanupTarget: String(process.env.HOUZEZ_CLEANUP_TARGET),
        reportRoot: backupsRoot,
        allowAnomalousKey: args.allowAnomalousKey,
      });

      console.log(
        JSON.stringify(
          {
            mode: 'execute',
            ok: result.ok,
            finalStatus: result.finalStatus,
            messages: result.messages,
            reportPath: result.reportPath,
            summary: result.report
              ? {
                  target: result.report.target,
                  tenantSlug: result.report.tenantSlug,
                  dbHostMasked: result.report.dbHostMasked,
                  manifestHashValidatedAbbreviated: `${result.report.manifestHashValidated.slice(0, 12)}…${result.report.manifestHashValidated.slice(-12)}`,
                  preCountsByTenant: result.report.preCountsByTenant,
                  postCountsByTenant: result.report.postCountsByTenant,
                  dbTransaction: {
                    attempted: result.report.dbTransaction.attempted,
                    succeeded: result.report.dbTransaction.succeeded,
                    propertiesDeleted:
                      result.report.dbTransaction.propertiesDeleted,
                    relatedDeleted: result.report.dbTransaction.relatedDeleted,
                  },
                  allowlistCount: result.report.allowlistCount,
                  r2DeletedCount: result.report.r2DeletedCount,
                  r2RequiresRetryCount: result.report.r2RequiresRetryCount,
                  seedSkippedCount: result.report.seedSkippedCount,
                  anomalousSkippedCount: result.report.anomalousSkippedCount,
                  deleteObjectAttempts: result.report.deleteObjectAttempts,
                  r2Outcomes: result.report.r2Results.map((r) => ({
                    keySuffix: r.storageKey.slice(-32),
                    deleteOk: r.deleteOk,
                    postHeadExists: r.postHeadExists,
                    outcome: r.outcome,
                  })),
                  remoteWrites: result.report.remoteWrites,
                  listObjectsUsed: result.report.listObjectsUsed,
                  putObjectUsed: result.report.putObjectUsed,
                  finalStatus: result.report.finalStatus,
                  errors: result.report.errors,
                }
              : null,
          },
          null,
          2,
        ),
      );
      if (!result.ok) process.exitCode = 1;
    } finally {
      r2Delete.destroy();
      r2Head.destroy();
    }
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  } finally {
    await disconnectPrisma(bundle);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
