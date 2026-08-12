import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { HOUZEZ_DATASET_MANIFEST_ID, HOUZEZ_SQL_FRAGMENTS } from '../constants';

export type DatasetFragmentSpec = {
  fileName: string;
  sha256: string;
  bytes: number;
};

export type DatasetManifestDocument = {
  manifestId: string;
  datasetId: string;
  version: number;
  description: string;
  fragments: DatasetFragmentSpec[];
};

export type DatasetManifestValidation =
  | {
      ok: true;
      manifestId: string;
      datasetId: string;
      version: number;
      fragmentCount: number;
      checkedFiles: string[];
      fragmentDigests: Array<{
        fileName: string;
        sha256: string;
        bytes: number;
      }>;
    }
  | {
      ok: false;
      manifestId: string;
      errors: string[];
    };

const MANIFEST_FILENAME = 'houzez-dataset-manifest.v1.json';

export function loadBundledDatasetManifest(
  manifestPath: string = path.join(__dirname, MANIFEST_FILENAME),
): DatasetManifestDocument {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw) as DatasetManifestDocument;
}

export function assertManifestMatchesConstants(
  manifest: DatasetManifestDocument,
): string[] {
  const errors: string[] = [];
  if (manifest.manifestId !== HOUZEZ_DATASET_MANIFEST_ID) {
    errors.push(
      `Manifest id "${manifest.manifestId}" does not match constant "${HOUZEZ_DATASET_MANIFEST_ID}".`,
    );
  }
  const expected = [...HOUZEZ_SQL_FRAGMENTS];
  const actual = manifest.fragments.map((f) => f.fileName);
  if (actual.length !== expected.length) {
    errors.push(
      `Manifest fragment count ${actual.length} != expected ${expected.length}.`,
    );
  }
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      errors.push(
        `Manifest fragment order/name mismatch at index ${i}: expected "${expected[i]}", got "${actual[i] ?? '(missing)'}".`,
      );
    }
  }
  return errors;
}

async function sha256File(absolutePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absolutePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Validate local SQL fragments against the versioned dataset manifest.
 * On mismatch: fail (do not auto-update the manifest).
 */
export async function validateDatasetManifest(input: {
  sourceDir: string;
  manifest?: DatasetManifestDocument;
}): Promise<DatasetManifestValidation> {
  const manifest = input.manifest ?? loadBundledDatasetManifest();
  const structural = assertManifestMatchesConstants(manifest);
  if (structural.length) {
    return {
      ok: false,
      manifestId: manifest.manifestId,
      errors: structural,
    };
  }

  const errors: string[] = [];
  const checkedFiles: string[] = [];
  const sourceDir = input.sourceDir;

  const expectedNames = new Set(manifest.fragments.map((f) => f.fileName));
  let dirEntries: string[] = [];
  try {
    dirEntries = fs.readdirSync(sourceDir);
  } catch {
    return {
      ok: false,
      manifestId: manifest.manifestId,
      errors: [
        `Source directory not readable for dataset manifest validation.`,
      ],
    };
  }

  const extras = dirEntries.filter(
    (name) =>
      /^valorar-houzez-\d+\.sql$/i.test(name) && !expectedNames.has(name),
  );
  if (extras.length) {
    errors.push(
      `Unexpected SQL fragment(s) in source-dir: ${extras.sort().join(', ')}. Manifest update requires owner review.`,
    );
  }

  for (const fragment of manifest.fragments) {
    const absolutePath = path.join(sourceDir, fragment.fileName);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      errors.push(`Missing required fragment: ${fragment.fileName}`);
      continue;
    }
    const stat = fs.statSync(absolutePath);
    if (stat.size !== fragment.bytes) {
      errors.push(
        `Size mismatch for ${fragment.fileName}: expected ${fragment.bytes} bytes, found ${stat.size}. Manifest update requires owner review.`,
      );
    }
    const digest = (await sha256File(absolutePath)).toLowerCase();
    const expected = fragment.sha256.toLowerCase();
    if (digest !== expected) {
      errors.push(
        `SHA256 mismatch for ${fragment.fileName}. Manifest update requires owner review.`,
      );
    } else {
      checkedFiles.push(fragment.fileName);
    }
  }

  if (errors.length) {
    return { ok: false, manifestId: manifest.manifestId, errors };
  }

  return {
    ok: true,
    manifestId: manifest.manifestId,
    datasetId: manifest.datasetId,
    version: manifest.version,
    fragmentCount: manifest.fragments.length,
    checkedFiles,
    fragmentDigests: manifest.fragments.map((f) => ({
      fileName: f.fileName,
      sha256: f.sha256,
      bytes: f.bytes,
    })),
  };
}
