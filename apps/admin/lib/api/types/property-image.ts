export type AdminPropertyImage = {
  id: string;
  tenantId: string;
  propertyId: string;
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

export type CreatePropertyImagePayload = {
  storageKey: string;
  url?: string;
  altText?: string;
  sortOrder?: number;
};

export type UpdatePropertyImagePayload = {
  url?: string;
  altText?: string;
  sortOrder?: number;
  isCover?: boolean;
};

export type PropertyImageFormValues = {
  storageKey: string;
  url: string;
  altText: string;
  sortOrder: string;
};
