export type StorageConfig = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  region: string;
};

export function getStorageConfig(): StorageConfig {
  const endpoint = process.env.STORAGE_ENDPOINT?.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.STORAGE_BUCKET?.trim();
  const publicUrl = process.env.STORAGE_PUBLIC_URL?.trim()?.replace(/\/$/, '');

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      'Storage is not configured. Set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET and STORAGE_PUBLIC_URL.',
    );
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
    region: process.env.STORAGE_REGION?.trim() || 'auto',
  };
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.STORAGE_ENDPOINT?.trim() &&
      process.env.STORAGE_ACCESS_KEY_ID?.trim() &&
      process.env.STORAGE_SECRET_ACCESS_KEY?.trim() &&
      process.env.STORAGE_BUCKET?.trim() &&
      process.env.STORAGE_PUBLIC_URL?.trim(),
  );
}
