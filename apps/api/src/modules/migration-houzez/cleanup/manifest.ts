import { createHash } from 'node:crypto';
import type { PropertyImageManifestRow, TenantCounts } from './types';

/**
 * Stable SHA-256 over sorted rows including classification, status, and
 * deleteAuthorized so policy changes invalidate the manifest hash.
 */
export function computeManifestStableHash(
  images: Pick<
    PropertyImageManifestRow,
    | 'id'
    | 'storageKey'
    | 'classification'
    | 'status'
    | 'deleteAuthorized'
    | 'isAnomalousKey'
  >[],
): string {
  const lines = images
    .map((row) =>
      [
        row.id,
        row.storageKey,
        row.classification,
        row.status,
        row.deleteAuthorized ? '1' : '0',
        row.isAnomalousKey ? '1' : '0',
      ].join('\t'),
    )
    .sort((a, b) => a.localeCompare(b));
  return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

export function summarizeStatuses(
  images: Pick<PropertyImageManifestRow, 'status'>[],
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const row of images) {
    summary[row.status] = (summary[row.status] ?? 0) + 1;
  }
  return summary;
}

export function diffExpectedCounts(
  actual: TenantCounts,
  expected: TenantCounts,
): string[] {
  const diffs: string[] = [];
  for (const key of Object.keys(expected) as (keyof TenantCounts)[]) {
    if (actual[key] !== expected[key]) {
      diffs.push(`${key}: expected ${expected[key]}, got ${actual[key]}`);
    }
  }
  return diffs;
}
