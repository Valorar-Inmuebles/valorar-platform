export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_PROPERTY_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const MAX_PROPERTY_IMAGES = 30;

export const SIGNED_UPLOAD_URL_EXPIRES_SECONDS = 900;
