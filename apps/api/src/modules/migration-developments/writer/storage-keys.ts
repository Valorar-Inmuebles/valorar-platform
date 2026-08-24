import { DEVELOPMENTS_SOURCE_SYSTEM, STORAGE_KEY_PREFIX } from '../constants';

export function buildDevelopmentImageStorageKey(input: {
  tenantId: string;
  sourceId: string;
  filename: string;
}): string {
  return [
    input.tenantId,
    STORAGE_KEY_PREFIX,
    input.sourceId,
    input.filename,
  ].join('/');
}

export function storagePrefixForTenant(tenantId: string): string {
  return `${tenantId}/${STORAGE_KEY_PREFIX}/`;
}

export function isDevelopmentMigrationKey(
  tenantId: string,
  key: string,
): boolean {
  const prefix = storagePrefixForTenant(tenantId);
  return key.startsWith(prefix) && !key.includes('wordpress-houzez');
}

export const SOURCE_SYSTEM_METADATA = DEVELOPMENTS_SOURCE_SYSTEM;
