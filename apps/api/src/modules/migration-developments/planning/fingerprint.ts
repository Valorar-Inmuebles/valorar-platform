import * as crypto from 'node:crypto';

export function sha256Json(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(stableStringify(value))
    .digest('hex');
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortValue(record[key]);
    }
    return sorted;
  }
  return value;
}
