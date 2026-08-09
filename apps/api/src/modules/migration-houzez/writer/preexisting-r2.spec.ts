import { PILOT_5312_EXPECTED_RELATIVE_KEYS, PILOT_WP_ID } from '../constants';
import type { ImagePlanEntry } from '../types';
import { InMemoryMigrationObjectStore } from './migration-object-store';
import { validatePilotPreexistingR2Objects } from './preexisting-r2';
import { buildHouzezMigrationImageKey } from './storage-keys';

function mimeForRelative(relative: string): string {
  if (relative.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

function makePilotImages(): ImagePlanEntry[] {
  return PILOT_5312_EXPECTED_RELATIVE_KEYS.map((relative, index) => {
    const match = relative.match(/^(\d+)-wp(\d+)\.(\w+)$/)!;
    return {
      sortOrder: Number(match[1]),
      attachmentId: Number(match[2]),
      isCover: index === 0,
      relativePath: relative,
      absolutePath: null,
      exists: true,
      mimeType: mimeForRelative(relative),
      width: 100,
      height: 100,
      fileSizeBytes: 100 + index,
      sha256: 'a'.repeat(64),
      proposedStorageKeyPattern: 'x',
      proposedFilename: relative,
    };
  });
}

function seedAllSeven(
  store: InMemoryMigrationObjectStore,
  tenantId: string,
  images: ImagePlanEntry[],
  mutate?: (
    relative: string,
    body: Buffer,
    contentType: string,
  ) => {
    body: Buffer;
    contentType: string;
  },
): void {
  for (const relative of PILOT_5312_EXPECTED_RELATIVE_KEYS) {
    const match = relative.match(/^(\d+)-wp(\d+)\.(\w+)$/)!;
    const sortOrder = Number(match[1]);
    const attachmentId = Number(match[2]);
    const extension = match[3];
    const plan = images.find((img) => img.proposedFilename === relative)!;
    const key = buildHouzezMigrationImageKey({
      tenantId,
      sourceId: String(PILOT_WP_ID),
      sortOrder,
      attachmentId,
      extension,
    });
    const baseBody = Buffer.alloc(plan.fileSizeBytes ?? 10, 1);
    const baseType = plan.mimeType ?? mimeForRelative(relative);
    const adjusted = mutate
      ? mutate(relative, baseBody, baseType)
      : { body: baseBody, contentType: baseType };
    store.seedPreexisting(key, adjusted.body, adjusted.contentType);
  }
}

describe('validatePilotPreexistingR2Objects', () => {
  const tenantId = 'tenant-demo';

  it('accepts seven valid preexisting reusable objects', async () => {
    const store = new InMemoryMigrationObjectStore();
    const images = makePilotImages();
    seedAllSeven(store, tenantId, images);

    const result = await validatePilotPreexistingR2Objects({
      objectStore: store,
      tenantId,
      images,
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.missingKeys).toEqual([]);
    expect(result.incompatibleKeys).toEqual([]);
    expect(result.reusableKeys).toHaveLength(7);
    expect(result.preexistingKeys).toHaveLength(7);
  });

  it('aborts on incompatible size or content-type', async () => {
    const store = new InMemoryMigrationObjectStore();
    const images = makePilotImages();
    seedAllSeven(store, tenantId, images, (relative, body, contentType) => {
      if (relative === '00-wp5315.jpg') {
        return { body: Buffer.alloc(body.length + 50, 2), contentType };
      }
      if (relative === '01-wp6927.png') {
        return { body, contentType: 'image/jpeg' };
      }
      return { body, contentType };
    });

    const result = await validatePilotPreexistingR2Objects({
      objectStore: store,
      tenantId,
      images,
    });

    expect(result.ok).toBe(false);
    expect(result.incompatibleKeys).toEqual(
      expect.arrayContaining(['00-wp5315.jpg', '01-wp6927.png']),
    );
    expect(result.errors.some((e) => /incompatible size/i.test(e))).toBe(true);
    expect(
      result.errors.some((e) => /incompatible content-type/i.test(e)),
    ).toBe(true);
  });

  it('errors when expected keys are missing', async () => {
    const store = new InMemoryMigrationObjectStore();
    const images = makePilotImages();
    // Seed only the first three keys.
    for (const relative of PILOT_5312_EXPECTED_RELATIVE_KEYS.slice(0, 3)) {
      const match = relative.match(/^(\d+)-wp(\d+)\.(\w+)$/)!;
      const plan = images.find((img) => img.proposedFilename === relative)!;
      const key = buildHouzezMigrationImageKey({
        tenantId,
        sourceId: String(PILOT_WP_ID),
        sortOrder: Number(match[1]),
        attachmentId: Number(match[2]),
        extension: match[3],
      });
      store.seedPreexisting(
        key,
        Buffer.alloc(plan.fileSizeBytes ?? 10, 1),
        plan.mimeType ?? mimeForRelative(relative),
      );
    }

    const result = await validatePilotPreexistingR2Objects({
      objectStore: store,
      tenantId,
      images,
    });

    expect(result.ok).toBe(false);
    expect(result.missingKeys).toHaveLength(4);
    expect(result.errors.some((e) => /missing/i.test(e))).toBe(true);
  });
});
