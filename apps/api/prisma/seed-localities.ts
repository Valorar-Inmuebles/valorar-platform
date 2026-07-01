import type { PrismaClient } from '../generated/prisma/client';
import { dedupeActiveLocalities } from './seed-utils/dedupe-localities';
import {
  parseLocalidadesImportSql,
  readGeoImportSql,
} from './seed-utils/parse-geo-import-sql';
import { prepareLocalitySeedRecords } from './seed-utils/prepare-locality-records';
import type { ProvinceSeedMaps } from './seed-provinces';

export const LOCALITY_SEED_BATCH_SIZE = 500;
export const LOCALITY_SEED_PROGRESS_EVERY = 500;

function logLocalityProgress(processed: number, total: number): void {
  const pct = ((processed / total) * 100).toFixed(1);
  console.log(
    `[geo seed] localities: ${processed}/${total} (${pct}%)`,
  );
}

export async function seedLocalities(
  prisma: PrismaClient,
  provinceMaps: ProvinceSeedMaps,
): Promise<number> {
  console.log('[geo seed] localities: parsing localidades.sql...');
  const parseStartedAt = Date.now();
  const parsedRows = parseLocalidadesImportSql(readGeoImportSql('localidades.sql'));
  console.log(
    `[geo seed] localities: parsed ${parsedRows.length} rows in ${Date.now() - parseStartedAt}ms`,
  );

  console.log('[geo seed] localities: deduplicating active records...');
  const dedupeStartedAt = Date.now();
  const rows = dedupeActiveLocalities(parsedRows);
  console.log(
    `[geo seed] localities: ${rows.length} unique active localities in ${Date.now() - dedupeStartedAt}ms`,
  );

  console.log('[geo seed] localities: preparing insert payload...');
  const prepareStartedAt = Date.now();
  const records = prepareLocalitySeedRecords(rows, provinceMaps);
  console.log(
    `[geo seed] localities: prepared ${records.length} records in ${Date.now() - prepareStartedAt}ms`,
  );

  console.log('[geo seed] localities: clearing existing catalog rows...');
  const clearStartedAt = Date.now();
  await prisma.neighborhood.deleteMany({});
  const deleted = await prisma.locality.deleteMany({});
  console.log(
    `[geo seed] localities: deleted ${deleted.count} existing localities in ${Date.now() - clearStartedAt}ms`,
  );

  const total = records.length;
  let inserted = 0;
  const insertStartedAt = Date.now();

  console.log(
    `[geo seed] localities: inserting in batches of ${LOCALITY_SEED_BATCH_SIZE}...`,
  );

  for (let offset = 0; offset < total; offset += LOCALITY_SEED_BATCH_SIZE) {
    const batch = records.slice(offset, offset + LOCALITY_SEED_BATCH_SIZE);
    const result = await prisma.locality.createMany({ data: batch });
    inserted += result.count;

    const processed = Math.min(offset + batch.length, total);
    if (
      processed % LOCALITY_SEED_PROGRESS_EVERY === 0 ||
      processed === total
    ) {
      logLocalityProgress(processed, total);
    }
  }

  console.log(
    `[geo seed] localities: inserted ${inserted} rows in ${Date.now() - insertStartedAt}ms`,
  );

  return inserted;
}
