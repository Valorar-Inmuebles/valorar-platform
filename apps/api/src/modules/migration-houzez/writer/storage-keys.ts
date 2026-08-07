import { HOUZEZ_SOURCE_SYSTEM } from '../constants';

/**
 * Deterministic R2/object keys scoped by tenant + source identity.
 * Compatible with retries: same inputs → same key.
 * Pattern:
 *   {tenantId}/migrations/{sourceSystem}/{sourceId}/{sortOrder}-wp{attachmentId}.{ext}
 */
export function buildHouzezMigrationImageKey(input: {
  tenantId: string;
  sourceId: string;
  sortOrder: number;
  attachmentId: number;
  extension: string;
}): string {
  const ext = input.extension.replace(/^\./, '').toLowerCase() || 'jpg';
  const order = String(input.sortOrder).padStart(2, '0');
  return [
    input.tenantId,
    'migrations',
    HOUZEZ_SOURCE_SYSTEM,
    input.sourceId,
    `${order}-wp${input.attachmentId}.${ext}`,
  ].join('/');
}

export function extensionFromMimeOrFilename(
  mimeType: string | null,
  filename: string | null,
): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (filename) {
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (match?.[1]) return match[1].toLowerCase();
  }
  return 'jpg';
}
