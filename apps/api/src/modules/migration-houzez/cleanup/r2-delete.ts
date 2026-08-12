import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getStorageConfig } from '../../storage/storage.config';

/**
 * DeleteObject wrapper — ONLY imported by the execute path.
 * Dry-run must never import this module.
 */
export type CleanupR2Deleter = {
  deleteObject: (storageKey: string) => Promise<void>;
  destroy: () => void;
};

export function createCleanupR2Deleter(): CleanupR2Deleter {
  const config = getStorageConfig();
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  const bucket = config.bucket;

  return {
    async deleteObject(storageKey: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }),
      );
    },
    destroy() {
      client.destroy();
    },
  };
}
