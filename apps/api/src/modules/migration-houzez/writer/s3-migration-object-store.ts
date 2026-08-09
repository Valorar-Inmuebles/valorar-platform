/**
 * Optional S3/R2 adapter for Houzez import.
 * Uses the same AWS SDK client shape as StorageModule; config must come from
 * {@link getStorageConfig} (`STORAGE_*` vars) — no parallel credentials.
 * Unit tests must use InMemoryMigrationObjectStore — never this module against real R2.
 */
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type {
  MigrationObjectStore,
  PutObjectResult,
} from './migration-object-store';

export type S3MigrationObjectStoreConfig = {
  client: S3Client;
  bucket: string;
  publicUrlBase: string;
};

export function createS3MigrationObjectStore(
  config: S3MigrationObjectStoreConfig,
): MigrationObjectStore {
  const base = config.publicUrlBase.replace(/\/$/, '');

  return {
    async objectExists(key: string): Promise<boolean> {
      try {
        await config.client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        return true;
      } catch {
        return false;
      }
    },

    async headObject(key: string) {
      try {
        const head = await config.client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        return {
          exists: true,
          contentType: head.ContentType ?? null,
          contentLength:
            typeof head.ContentLength === 'number' ? head.ContentLength : null,
        };
      } catch {
        return {
          exists: false,
          contentType: null,
          contentLength: null,
        };
      }
    },

    async putObject(input: {
      key: string;
      body: Buffer;
      contentType: string;
    }): Promise<PutObjectResult> {
      let preexisting = false;
      try {
        await config.client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: input.key }),
        );
        preexisting = true;
      } catch {
        preexisting = false;
      }
      if (preexisting) {
        return { wrote: false, preexisting: true };
      }
      await config.client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );
      return { wrote: true, preexisting: false };
    },

    async deleteObject(key: string): Promise<void> {
      await config.client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },

    getPublicUrl(key: string): string {
      return `${base}/${key}`;
    },
  };
}
