import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  type AllowedImageMimeType,
} from '../storage.constants';

const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function assertAllowedImageMimeType(
  mimeType: string,
): AllowedImageMimeType {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType)) {
    throw new BadRequestException(
      `Unsupported mime type "${mimeType}". Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
    );
  }

  return mimeType as AllowedImageMimeType;
}

export function resolveImageExtension(
  mimeType: AllowedImageMimeType,
  filename?: string,
): string {
  if (filename) {
    const match = filename.trim().match(/\.([a-zA-Z0-9]+)$/);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return MIME_TO_EXTENSION[mimeType];
}

export function buildPropertyImageStorageKey(
  tenantId: string,
  propertyId: string,
  mimeType: string,
  filename?: string,
): string {
  const normalizedMimeType = assertAllowedImageMimeType(mimeType);
  const extension = resolveImageExtension(normalizedMimeType, filename);

  return `${tenantId}/properties/${propertyId}/${randomUUID()}.${extension}`;
}

export function buildGenericUploadStorageKey(
  tenantId: string,
  mimeType: string,
  filename?: string,
): string {
  const normalizedMimeType = assertAllowedImageMimeType(mimeType);
  const extension = resolveImageExtension(normalizedMimeType, filename);

  return `${tenantId}/uploads/${randomUUID()}.${extension}`;
}
