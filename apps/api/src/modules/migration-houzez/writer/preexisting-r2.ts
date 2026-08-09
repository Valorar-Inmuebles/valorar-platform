import {
  HOUZEZ_SOURCE_SYSTEM,
  PILOT_5312_EXPECTED_RELATIVE_KEYS,
  PILOT_WP_ID,
} from '../constants';
import { buildHouzezMigrationImageKey } from './storage-keys';
import type { ImagePlanEntry } from '../types';
import type { MigrationObjectStore } from './migration-object-store';

export type ObjectHeadMeta = {
  exists: boolean;
  contentType: string | null;
  contentLength: number | null;
};

export type PreexistingR2Validation = {
  ok: boolean;
  errors: string[];
  reusableKeys: string[];
  missingKeys: string[];
  incompatibleKeys: string[];
  /** Keys that already existed before this execution — never compensate/delete. */
  preexistingKeys: string[];
};

function expectedMime(filename: string): string {
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * HEAD the seven deterministic pilot keys. Reuse when present and compatible;
 * abort on size/type mismatch. Never delete or overwrite.
 */
export async function validatePilotPreexistingR2Objects(input: {
  objectStore: MigrationObjectStore;
  tenantId: string;
  sourceId?: string;
  images: ImagePlanEntry[];
}): Promise<PreexistingR2Validation> {
  const sourceId = input.sourceId ?? String(PILOT_WP_ID);
  const errors: string[] = [];
  const reusableKeys: string[] = [];
  const missingKeys: string[] = [];
  const incompatibleKeys: string[] = [];
  const preexistingKeys: string[] = [];

  const byFilename = new Map(
    input.images.map((img) => [img.proposedFilename, img]),
  );

  for (const relative of PILOT_5312_EXPECTED_RELATIVE_KEYS) {
    const match = relative.match(/^(\d+)-wp(\d+)\.(\w+)$/);
    if (!match) {
      errors.push(`Internal: bad expected relative key ${relative}`);
      continue;
    }
    const sortOrder = Number(match[1]);
    const attachmentId = Number(match[2]);
    const extension = match[3];
    const key = buildHouzezMigrationImageKey({
      tenantId: input.tenantId,
      sourceId,
      sortOrder,
      attachmentId,
      extension,
    });

    const plan = byFilename.get(relative);
    const head = await input.objectStore.headObject(key);
    if (!head.exists) {
      missingKeys.push(relative);
      continue;
    }

    preexistingKeys.push(key);
    const expectedType = plan?.mimeType ?? expectedMime(relative);
    const expectedSize = plan?.fileSizeBytes ?? null;

    let incompatible = false;
    if (
      head.contentType &&
      expectedType &&
      head.contentType.split(';')[0].trim().toLowerCase() !==
        expectedType.split(';')[0].trim().toLowerCase()
    ) {
      incompatible = true;
      errors.push(
        `Preexisting R2 object incompatible content-type for ${relative} (refusing overwrite).`,
      );
    }
    if (
      expectedSize != null &&
      head.contentLength != null &&
      head.contentLength !== expectedSize
    ) {
      incompatible = true;
      errors.push(
        `Preexisting R2 object incompatible size for ${relative} (refusing overwrite).`,
      );
    }

    if (incompatible) {
      incompatibleKeys.push(relative);
    } else {
      reusableKeys.push(key);
    }
  }

  // Missing is allowed only when the plan will upload fresh bytes for that key.
  // For production pilot, E.5 proved all seven exist — require all seven present & compatible.
  if (missingKeys.length) {
    errors.push(
      `Expected preexisting R2 keys missing under ${HOUZEZ_SOURCE_SYSTEM}/${sourceId}: ${missingKeys.join(', ')}.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    reusableKeys,
    missingKeys,
    incompatibleKeys,
    preexistingKeys,
  };
}
