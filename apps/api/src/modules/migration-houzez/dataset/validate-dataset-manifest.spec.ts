import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { HOUZEZ_DATASET_MANIFEST_ID, HOUZEZ_SQL_FRAGMENTS } from '../constants';
import {
  assertManifestMatchesConstants,
  loadBundledDatasetManifest,
  validateDatasetManifest,
  type DatasetManifestDocument,
} from './validate-dataset-manifest';

function writeFragment(
  dir: string,
  fileName: string,
  contents: string,
): { sha256: string; bytes: number } {
  const absolute = path.join(dir, fileName);
  fs.writeFileSync(absolute, contents, 'utf8');
  const buf = Buffer.from(contents, 'utf8');
  return {
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
  };
}

function buildTempManifest(
  dir: string,
  mutate?: (m: DatasetManifestDocument) => void,
): DatasetManifestDocument {
  const fragments = HOUZEZ_SQL_FRAGMENTS.map((fileName, i) => {
    const meta = writeFragment(dir, fileName, `fragment-${i}-payload\n`);
    return { fileName, ...meta };
  });
  const manifest: DatasetManifestDocument = {
    manifestId: HOUZEZ_DATASET_MANIFEST_ID,
    datasetId: 'test-dataset',
    version: 1,
    description: 'test',
    fragments,
  };
  mutate?.(manifest);
  return manifest;
}

describe('dataset manifest validation', () => {
  it('loads bundled manifest matching constants', () => {
    const manifest = loadBundledDatasetManifest();
    expect(assertManifestMatchesConstants(manifest)).toEqual([]);
    expect(manifest.manifestId).toBe(HOUZEZ_DATASET_MANIFEST_ID);
    expect(manifest.fragments).toHaveLength(6);
  });

  it('accepts matching local fragments', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-manifest-ok-'));
    try {
      const manifest = buildTempManifest(dir);
      const result = await validateDatasetManifest({
        sourceDir: dir,
        manifest,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.manifestId).toBe(HOUZEZ_DATASET_MANIFEST_ID);
        expect(result.checkedFiles).toHaveLength(6);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects missing fragment', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-manifest-miss-'));
    try {
      const manifest = buildTempManifest(dir);
      fs.unlinkSync(path.join(dir, HOUZEZ_SQL_FRAGMENTS[0]));
      const result = await validateDatasetManifest({
        sourceDir: dir,
        manifest,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((e) => /Missing required fragment/i.test(e)),
        ).toBe(true);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects hash mismatch without auto-updating', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-manifest-hash-'));
    try {
      const manifest = buildTempManifest(dir);
      fs.writeFileSync(
        path.join(dir, HOUZEZ_SQL_FRAGMENTS[1]),
        'tampered-contents',
        'utf8',
      );
      const result = await validateDatasetManifest({
        sourceDir: dir,
        manifest,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => /SHA256 mismatch/i.test(e))).toBe(
          true,
        );
        expect(result.errors.some((e) => /owner review/i.test(e))).toBe(true);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects unexpected extra valorar-houzez-NNN.sql', async () => {
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'houzez-manifest-extra-'),
    );
    try {
      const manifest = buildTempManifest(dir);
      fs.writeFileSync(path.join(dir, 'valorar-houzez-007.sql'), 'x', 'utf8');
      const result = await validateDatasetManifest({
        sourceDir: dir,
        manifest,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((e) => /Unexpected SQL fragment/i.test(e)),
        ).toBe(true);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
