import {
  MINI_PNG,
  makeTempDir,
  writeFolder,
} from '../__fixtures__/temp-source';
import { inspectFolder } from './discover-source';
import {
  buildImageMigrationSourceId,
  buildImageStorageKeyTemplate,
  inventoryImages,
} from './images';

describe('image inventory', () => {
  it('orders images by numeric stem and marks 001 as cover', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '001 - Agrelo 4066', {
      '002.png': MINI_PNG,
      '010.png': MINI_PNG,
      '001.png': MINI_PNG,
      'info.txt': 'Agrelo 4066\n',
    });

    const { images } = inventoryImages(folder, '001');
    expect(images.map((image) => image.filename)).toEqual([
      '001.png',
      '002.png',
      '010.png',
    ]);
    expect(images[0]).toMatchObject({
      isCover: true,
      sortOrder: 0,
      stem: '001',
    });
    expect(images[1]).toMatchObject({ isCover: false, sortOrder: 1 });
    expect(images[2]).toMatchObject({ isCover: false, sortOrder: 9 });
  });

  it('errors when the cover 001.* is missing', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '002 - Test', {
      '002.png': MINI_PNG,
      'info.txt': 'Test\n',
    });
    const { issues } = inventoryImages(folder, '002');
    expect(
      issues.some((issue) => issue.code === 'MISSING_COVER' && issue.blocking),
    ).toBe(true);
  });

  it('errors when the txt is missing or duplicated', () => {
    const root = makeTempDir();
    const missing = writeFolder(root, '001 - Agrelo 4066', {
      '001.png': MINI_PNG,
    });
    expect(
      inspectFolder(missing).issues.some(
        (issue) => issue.code === 'MISSING_TXT',
      ),
    ).toBe(true);

    const duplicated = writeFolder(root, '002 - Other', {
      '001.png': MINI_PNG,
      'info.txt': 'a',
      'extra.txt': 'b',
    });
    expect(
      inspectFolder(duplicated).issues.some(
        (issue) => issue.code === 'DUPLICATE_TXT',
      ),
    ).toBe(true);
  });

  it('detects png mime from magic bytes and ignores non-image extras as unexpected', () => {
    const root = makeTempDir();
    const folder = writeFolder(root, '001 - Agrelo 4066', {
      '001.png': MINI_PNG,
      'info.txt': 'Agrelo 4066\n',
      'notes.doc': 'nope',
    });
    const inspected = inspectFolder(folder);
    expect(inspected.images[0]?.mimeType).toBe('image/png');
    expect(inspected.unexpectedFiles).toContain('notes.doc');
  });

  it('builds deterministic source ids and storage keys', () => {
    expect(buildImageMigrationSourceId('001', '001.png')).toBe('001:001.png');
    expect(buildImageStorageKeyTemplate('001', '001.png', 'tenant-1')).toBe(
      'tenant-1/migrations/local-developments-v1/001/001.png',
    );
  });
});
