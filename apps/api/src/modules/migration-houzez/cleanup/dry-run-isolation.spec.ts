import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildR2DeleteAllowlist } from './classify';
import type { PropertyImageManifestRow } from './types';

/**
 * Architectural guard: dry-run module must not pull DeleteObject / execute path.
 */
describe('cleanup dry-run isolation', () => {
  const cleanupDir = __dirname;

  it('dry-run.ts does not import r2-delete or execute', () => {
    const source = fs.readFileSync(path.join(cleanupDir, 'dry-run.ts'), 'utf8');
    expect(source).not.toMatch(/from ['"]\.\/r2-delete['"]/);
    expect(source).not.toMatch(/from ['"]\.\/execute['"]/);
    expect(source).not.toMatch(/DeleteObjectCommand/);
    expect(source).not.toMatch(/runCleanupExecute/);
    expect(source).not.toMatch(/\$executeRaw/);
    expect(source).not.toMatch(/\$executeRawUnsafe/);
    expect(source).not.toMatch(/DELETE FROM/);
  });

  it('r2-verify.ts only uses HeadObjectCommand', () => {
    const source = fs.readFileSync(
      path.join(cleanupDir, 'r2-verify.ts'),
      'utf8',
    );
    expect(source).toMatch(/HeadObjectCommand/);
    expect(source).not.toMatch(/DeleteObjectCommand/);
    expect(source).not.toMatch(/PutObjectCommand/);
  });

  it('CLI script keeps execute behind a separate branch', () => {
    const script = fs.readFileSync(
      path.resolve(
        cleanupDir,
        '../../../../scripts/houzez-cleanup-demo-properties.ts',
      ),
      'utf8',
    );
    expect(script).toMatch(/modeResult\.mode === 'dry-run'/);
    expect(script).toMatch(/do NOT require execute\.ts or r2-delete\.ts/);
    const dryIdx = script.indexOf("modeResult.mode === 'dry-run'");
    const execImportIdx = script.indexOf('cleanup/r2-delete');
    expect(dryIdx).toBeGreaterThan(-1);
    expect(execImportIdx).toBeGreaterThan(dryIdx);
  });

  it('not_found rows never enter DeleteObject allowlist', () => {
    const rows: PropertyImageManifestRow[] = [
      {
        id: '1',
        propertyId: 'p',
        storageKey: 'tenants/demo/properties/x/cover.webp',
        url: '/seed/properties/x/cover.webp',
        mimeType: 'image/webp',
        fileSize: null,
        isCover: true,
        sortOrder: 0,
        r2: { exists: false, etag: null, error: 'not_found' },
        classification: 'expected_seed_not_found',
        status: 'not_found',
        isAnomalousKey: false,
        deleteAuthorized: false,
        authorizationReason: 'seed',
      },
      {
        id: '2',
        propertyId: 'p',
        storageKey: 'orphan.jpg',
        url: null,
        mimeType: null,
        fileSize: null,
        isCover: false,
        sortOrder: 1,
        r2: { exists: false, etag: null, error: 'not_found' },
        classification: 'unexpected_not_found',
        status: 'not_found',
        isAnomalousKey: false,
        deleteAuthorized: false,
        authorizationReason: 'unexpected',
      },
      {
        id: '3',
        propertyId: 'p',
        storageKey: 'tenant/properties/p/uuid.jpg',
        url: 'https://r2.dev/x',
        mimeType: 'image/jpeg',
        fileSize: 1,
        isCover: false,
        sortOrder: 2,
        r2: { exists: true, etag: 'e', error: null },
        classification: 'r2_object',
        status: 'storage_verified',
        isAnomalousKey: false,
        deleteAuthorized: true,
        authorizationReason: 'exists',
      },
    ];
    expect(buildR2DeleteAllowlist(rows)).toEqual([
      'tenant/properties/p/uuid.jpg',
    ]);
  });
});
