/**
 * Houzez migration CLI — audit / dry-run only (no writes).
 *
 * Usage:
 *   npx tsx scripts/houzez-migrate.ts audit --source-dir <path> --report-dir <path>
 *   npx tsx scripts/houzez-migrate.ts dry-run --wp-id=5312 --tenant=demo --owner-email=admin@demo.valorar.dev
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import {
  DEFAULT_OWNER_EMAIL,
  DEFAULT_TENANT_SLUG,
  PILOT_WP_ID,
} from '../src/modules/migration-houzez/constants';
import {
  runAudit,
  runDryRun,
  type CliOptions,
} from '../src/modules/migration-houzez/services/houzez-runner.service';

type Args = Record<string, string | boolean>;

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
  // Positional fallback: audit|dry-run <sourceDir> [reportDir]
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

function createPrismaClient(): object | null {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) loadEnv({ path: envPath });
    else {
      const sibling = path.resolve(
        process.cwd(),
        '../../../valorar-platform/apps/api/.env',
      );
      if (fs.existsSync(sibling)) loadEnv({ path: sibling });
      const alt = 'C:/cursor/valorar-platform/apps/api/.env';
      if (fs.existsSync(alt)) loadEnv({ path: alt });
    }

    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not set — continuing without DB lookups.');
      return null;
    }

    // Dynamic requires keep the CLI runnable via tsx without ESM extension friction.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const { PrismaClient } = require('../generated/prisma/client');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const { PrismaPg } = require('@prisma/adapter-pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const { Pool } = require('pg');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    (prisma as { __pool?: { end: () => Promise<void> } }).__pool = pool;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return prisma;
  } catch (error) {
    console.error(
      'Prisma client unavailable:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function disconnectPrisma(prisma: object | null) {
  if (!prisma || typeof prisma !== 'object') return;
  const client = prisma as {
    $disconnect?: () => Promise<void>;
    __pool?: { end: () => Promise<void> };
  };
  try {
    await client.$disconnect?.();
  } catch {
    /* ignore */
  }
  try {
    await client.__pool?.end();
  } catch {
    /* ignore */
  }
}

function printHelp() {
  console.log(`Houzez migration CLI (read-only modes)

Commands:
  audit      Stream-dump audit report
  dry-run    Plan transform for one WP property (default --wp-id=${PILOT_WP_ID})

Options:
  --source-dir=PATH     Folder with valorar-houzez-00N.sql + uploads/
  --report-dir=PATH     Output JSON reports (default migration-data/reports)
  --tenant=SLUG         Tenant slug (default ${DEFAULT_TENANT_SLUG})
  --owner-email=EMAIL   Owner email (default ${DEFAULT_OWNER_EMAIL})
  --wp-id=ID            WordPress property ID for dry-run
  --statuses=a,b        Optional status allow-list (protected; publish recommended)
  --batch-id=ID         Optional batch id
  --skip-db             Skip Neon/Prisma lookups

Write/import mode is NOT available in this phase.
`);
}

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2));
  if (command === 'help' || args.help) {
    printHelp();
    return;
  }

  if (command === 'import' || command === 'write') {
    console.error(
      'Write/import mode is disabled in this phase. Use audit or dry-run.',
    );
    process.exitCode = 2;
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
    const report = await runAudit(options);
    console.log(
      JSON.stringify(
        {
          mode: report.mode,
          reportFile: path.join(reportDir, 'houzez-audit.json'),
          propertyCountByStatus: report.dump.propertyCountByStatus,
          permalink: report.dump.permalink,
          galleryLimitBlocked: report.dump.galleryLimitBlocked,
          wouldWrite: false,
        },
        null,
        2,
      ),
    );
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
    // Default protect: only publish unless explicitly overridden with publish in list
    if (!options.statuses) options.statuses = ['publish'];

    const prisma = options.skipDb ? null : createPrismaClient();
    try {
      const report = await runDryRun(options, prisma);
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
            ownerOk: report.owner.ok,
            blockers: report.blockers,
            warnings: report.warnings,
            imageSummary: report.imageSummary,
            oldUrl: report.oldUrl,
            catalogs: report.catalogs.map((c) => ({
              key: c.key,
              status: c.status,
              detail: c.detail,
            })),
            plannedEntityCount: report.plannedEntities.length,
            idempotency: report.idempotency,
            wouldWrite: false,
          },
          null,
          2,
        ),
      );
      if (report.blockers.length) process.exitCode = 1;
    } finally {
      await disconnectPrisma(prisma);
    }
    return;
  }

  printHelp();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
