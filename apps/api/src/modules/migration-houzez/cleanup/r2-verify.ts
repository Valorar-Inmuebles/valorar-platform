import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getStorageConfig } from '../../storage/storage.config';

export type HeadObjectResult =
  | { ok: true; exists: true; etag: string | null }
  | { ok: true; exists: false; etag: null }
  | { ok: false; exists: null; etag: null; error: string; fatal: boolean };

export type CleanupR2Reader = {
  headObject: (storageKey: string) => Promise<HeadObjectResult>;
  destroy: () => void;
};

/**
 * Read-only R2/S3 client for dry-run verification (HeadObject only).
 * Does not expose DeleteObject.
 */
export function createCleanupR2Reader(): CleanupR2Reader {
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
    async headObject(storageKey: string): Promise<HeadObjectResult> {
      try {
        const response = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: storageKey }),
        );
        return {
          ok: true,
          exists: true,
          etag: response.ETag?.replace(/"/g, '') ?? null,
        };
      } catch (error: unknown) {
        const err = error as {
          name?: string;
          $metadata?: { httpStatusCode?: number };
          message?: string;
        };
        const status = err.$metadata?.httpStatusCode;
        const name = err.name ?? '';
        if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') {
          // Not found is recorded, but must NOT be treated as successful verification.
          return { ok: true, exists: false, etag: null };
        }
        const message = err.message ?? String(error);
        const fatal =
          status === 401 ||
          status === 403 ||
          /credential|accessdenied|invalidaccesskey|signature|networkingerror|econnrefused|enotfound|timeout/i.test(
            `${name} ${message}`,
          );
        return {
          ok: false,
          exists: null,
          etag: null,
          error: message,
          fatal,
        };
      }
    },
    destroy() {
      client.destroy();
    },
  };
}
