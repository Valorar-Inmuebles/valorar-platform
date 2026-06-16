export type SignedUploadUrlResult = {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
};

export interface StorageService {
  getSignedUploadUrl(
    storageKey: string,
    mimeType: string,
  ): Promise<SignedUploadUrlResult>;

  getPublicUrl(storageKey: string): string;

  deleteObject(storageKey: string): Promise<void>;
}
