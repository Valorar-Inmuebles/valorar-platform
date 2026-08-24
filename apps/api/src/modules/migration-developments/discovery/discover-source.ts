import * as fs from 'node:fs';
import * as path from 'node:path';
import { IMAGE_FILE_PATTERN, TXT_EXTENSIONS } from '../constants';
import type { FolderInventory, SourceIssue } from '../types';
import { compareOrdinal, parseFolderName } from './folder-name';
import { inventoryImages } from './images';

function isTxtFile(filename: string): boolean {
  return TXT_EXTENSIONS.includes(
    path.extname(filename).toLowerCase() as (typeof TXT_EXTENSIONS)[number],
  );
}

export function discoverSourceFolders(
  sourcePath: string,
  tenantId?: string,
): FolderInventory[] {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    throw new Error(`Source directory does not exist: ${sourcePath}`);
  }

  const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
  const folders: FolderInventory[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    folders.push(inspectFolder(path.join(sourcePath, entry.name), tenantId));
  }

  return folders.sort((left, right) =>
    compareOrdinal(left.ordinal, right.ordinal),
  );
}

export function inspectFolder(
  folderPath: string,
  tenantId?: string,
): FolderInventory {
  const folderName = path.basename(folderPath);
  const parsed = parseFolderName(folderName);
  const issues: SourceIssue[] = [];

  if (!parsed) {
    issues.push({
      code: 'INVALID_FOLDER_NAME',
      severity: 'error',
      blocking: true,
      message: `Folder name "${folderName}" does not match "NNN - Public name".`,
    });
  } else if (!parsed.publicName.trim()) {
    issues.push({
      code: 'EMPTY_PUBLIC_NAME',
      severity: 'error',
      blocking: true,
      message: `Folder "${folderName}" has an empty public name.`,
    });
  }

  const sourceId = parsed?.sourceId ?? '000';
  const files = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const txtFiles = files.filter(isTxtFile);
  if (txtFiles.length === 0) {
    issues.push({
      code: 'MISSING_TXT',
      severity: 'error',
      blocking: true,
      message: 'No .txt file found in the folder.',
    });
  } else if (txtFiles.length > 1) {
    issues.push({
      code: 'DUPLICATE_TXT',
      severity: 'error',
      blocking: true,
      message: `Multiple .txt files: ${txtFiles.join(', ')}.`,
    });
  }

  const unexpectedFiles = files.filter(
    (filename) => !isTxtFile(filename) && !IMAGE_FILE_PATTERN.test(filename),
  );
  for (const filename of unexpectedFiles) {
    issues.push({
      code: 'UNEXPECTED_FILE',
      severity: 'warning',
      blocking: false,
      message: `Unexpected file "${filename}".`,
    });
  }

  const imageResult = parsed
    ? inventoryImages(folderPath, parsed.sourceId, tenantId)
    : { images: [], issues: [] as SourceIssue[] };

  return {
    absolutePath: folderPath,
    folderName,
    sourceId,
    ordinal: parsed?.ordinal ?? Number.MAX_SAFE_INTEGER,
    publicNameFromFolder: parsed?.publicName ?? '',
    txtFiles: txtFiles.map((filename) => path.join(folderPath, filename)),
    images: imageResult.images,
    unexpectedFiles,
    issues: [...issues, ...imageResult.issues],
  };
}
