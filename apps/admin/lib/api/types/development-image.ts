export type AdminDevelopmentImage = {
  id: string;
  tenantId: string;
  developmentId: string;
  storageKey: string;
  url: string | null;
  altText: string | null;
  mimeType: string | null;
  fileSize: number | null;
  sortOrder: number;
  isCover: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DevelopmentImageUploadUrlResponse = {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
};

export type CreateDevelopmentImagePayload = {
  storageKey: string;
  url?: string;
  altText?: string;
  mimeType?: string;
  fileSize?: number;
  sortOrder?: number;
};

export type UpdateDevelopmentImagePayload = {
  altText?: string;
  isCover?: boolean;
};

export type ReorderDevelopmentImageItem = {
  id: string;
  sortOrder: number;
};

export type DevelopmentImageEditFormValues = {
  altText: string;
};

export const ALLOWED_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
