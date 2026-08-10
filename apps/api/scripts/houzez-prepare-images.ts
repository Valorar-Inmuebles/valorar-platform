/**
 * Local-only preparation of optimized WebP images for a Houzez property.
 * Does NOT upload to R2 and does NOT write to PostgreSQL.
 *
 * Usage (from apps/api):
 *   npx tsx scripts/houzez-prepare-images.ts --wp-id=5312 --tenant-id=<cuid> --source-dir=../../migration-data
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PILOT_WP_ID } from '../src/modules/migration-houzez/constants';
import { extractWordpressDump } from '../src/modules/migration-houzez/wordpress/extract-properties';
import { prepareOptimizedImagesLocally } from '../src/modules/migration-houzez/images/prepare-local';

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

async function main(): Promise<void> {
  loadEnv({ path: path.resolve(process.cwd(), '.env') });
  const args = parseArgs(process.argv.slice(2));
  const wpId = Number(args['wp-id'] ?? PILOT_WP_ID);
  const tenantId = String(args['tenant-id'] ?? '');
  const sourceDir = path.resolve(
    String(args['source-dir'] ?? '../../migration-data'),
  );
  const outputRoot = path.resolve(
    String(args['output-root'] ?? path.join(sourceDir, 'prepared')),
  );
  const dryRunReportPath = args['dry-run-report']
    ? path.resolve(String(args['dry-run-report']))
    : null;
  const fingerprint = args.fingerprint ? String(args.fingerprint) : null;

  if (!tenantId) {
    throw new Error('--tenant-id is required (demo tenant cuid).');
  }
  if (wpId !== PILOT_WP_ID) {
    throw new Error(
      `This script currently only prepares WP ${PILOT_WP_ID} (got ${wpId}).`,
    );
  }
  if (!fs.existsSync(path.join(sourceDir, 'uploads'))) {
    throw new Error(`uploads/ not found under source-dir=${sourceDir}`);
  }

  const dump = await extractWordpressDump(sourceDir);
  const property = dump.properties.get(wpId);
  if (!property) {
    throw new Error(`WP property ${wpId} not found in dump.`);
  }

  const manifest = await prepareOptimizedImagesLocally({
    property,
    attachments: dump.attachments,
    uploadsDir: path.join(sourceDir, 'uploads'),
    outputRoot,
    tenantId,
    dryRunReportPath,
    fingerprint,
  });

  console.log(
    JSON.stringify(
      {
        status: manifest.status,
        wpId: manifest.wpId,
        outputDir: manifest.outputDir,
        imageCount: manifest.imageCount,
        pipelineVersion: manifest.pipelineVersion,
        images: manifest.images.map((img) => ({
          attachmentId: img.attachmentId,
          isCover: img.isCover,
          sourcePath: img.sourcePath,
          sourceBytes: img.sourceBytes,
          outputBytes: img.outputBytes,
          reductionPercent: img.reductionPercent,
          outputSha256: img.outputSha256,
          storageKey: img.storageKey,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
