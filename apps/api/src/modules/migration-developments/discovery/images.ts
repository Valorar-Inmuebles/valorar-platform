import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  IMAGE_FILE_PATTERN,
  STORAGE_KEY_PREFIX,
  type SupportedImageExtension,
} from '../constants';
import {
  MAX_DEVELOPMENT_IMAGES,
  MAX_PROPERTY_IMAGE_FILE_SIZE_BYTES,
} from '../../storage/storage.constants';
import type { InventoryImage, SourceIssue } from '../types';

const EXT_TO_MIME: Record<SupportedImageExtension, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function detectImageMimeType(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 6 &&
    buffer.subarray(0, 6).toString('ascii') === 'GIF87a'
  ) {
    return 'image/gif';
  }
  if (
    buffer.length >= 6 &&
    buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
  ) {
    return 'image/gif';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function normalizeImageExtension(
  extension: string,
): SupportedImageExtension {
  const normalized = extension.replace(/^\./, '').toLowerCase();
  if (normalized === 'jpeg') {
    return 'jpeg';
  }
  return normalized as SupportedImageExtension;
}

export function buildImageStorageKeyTemplate(
  sourceId: string,
  filename: string,
  tenantId = '{tenantId}',
): string {
  return `${tenantId}/${STORAGE_KEY_PREFIX}/${sourceId}/${filename}`;
}

export function buildImageMigrationSourceId(
  sourceId: string,
  filename: string,
): string {
  return `${sourceId}:${filename}`;
}

export function inventoryImages(
  folderPath: string,
  sourceId: string,
  tenantId?: string,
): { images: InventoryImage[]; issues: SourceIssue[] } {
  const files = fs.readdirSync(folderPath, { withFileTypes: true });
  const issues: SourceIssue[] = [];
  const byStem = new Map<string, InventoryImage[]>();

  for (const entry of files) {
    if (!entry.isFile()) {
      continue;
    }

    const match = entry.name.match(IMAGE_FILE_PATTERN);
    if (!match) {
      continue;
    }

    const stem = match[1];
    const extension = normalizeImageExtension(match[2]);
    const absolutePath = path.join(folderPath, entry.name);
    const buffer = fs.readFileSync(absolutePath);
    const mimeType =
      detectImageMimeType(buffer) ?? EXT_TO_MIME[extension] ?? null;
    const stemNumber = Number.parseInt(stem, 10);
    const image: InventoryImage = {
      absolutePath,
      filename: entry.name,
      stem,
      stemNumber,
      extension,
      mimeType,
      fileSize: buffer.length,
      checksumSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      isCover: stemNumber === 1,
      sortOrder: stemNumber - 1,
      storageKeyTemplate: buildImageStorageKeyTemplate(
        sourceId,
        entry.name,
        tenantId,
      ),
      migrationSourceId: buildImageMigrationSourceId(sourceId, entry.name),
    };

    if (buffer.length > MAX_PROPERTY_IMAGE_FILE_SIZE_BYTES) {
      issues.push({
        code: 'FILE_TOO_LARGE',
        severity: 'error',
        blocking: true,
        message: `${entry.name} exceeds the maximum file size.`,
      });
    }

    const existing = byStem.get(stem) ?? [];
    existing.push(image);
    byStem.set(stem, existing);
  }

  const images: InventoryImage[] = [];
  for (const [stem, group] of byStem) {
    if (group.length > 1) {
      issues.push({
        code: 'DUPLICATE_IMAGE_STEM',
        severity: 'error',
        blocking: true,
        message: `Duplicate image stem ${stem}: ${group.map((item) => item.filename).join(', ')}.`,
      });
    }
    images.push(...group);
  }

  images.sort((left, right) => left.stemNumber - right.stemNumber);

  if (!images.some((image) => image.stemNumber === 1)) {
    issues.push({
      code: 'MISSING_COVER',
      severity: 'error',
      blocking: true,
      message: 'Cover image 001.* is missing.',
    });
  }

  if (images.length > MAX_DEVELOPMENT_IMAGES) {
    issues.push({
      code: 'TOO_MANY_IMAGES',
      severity: 'error',
      blocking: true,
      message: `Found ${images.length} images; maximum is ${MAX_DEVELOPMENT_IMAGES}.`,
    });
  }

  return { images, issues };
}
