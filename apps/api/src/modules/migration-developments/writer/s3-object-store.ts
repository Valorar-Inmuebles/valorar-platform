import {
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type {
  HeadObjectMeta,
  MigrationObjectStore,
  PutObjectResult,
} from './object-store';

export type S3MigrationObjectStoreConfig = {
  client: S3Client;
  bucket: string;
  publicUrlBase: string;
};

function isNotFound(error: unknown): boolean {
  const value = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    value.name === 'NotFound' ||
    value.name === 'NoSuchKey' ||
    value.name === 'NotFoundError' ||
    value.$metadata?.httpStatusCode === 404
  );
}

export function createS3MigrationObjectStore(
  config: S3MigrationObjectStoreConfig,
): MigrationObjectStore {
  const base = config.publicUrlBase.replace(/\/$/, '');

  const store: MigrationObjectStore = {
    async objectExists(key: string): Promise<boolean> {
      const head = await store.headObject(key);
      return head.exists;
    },

    async headObject(key: string): Promise<HeadObjectMeta> {
      try {
        const head = await config.client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        const metadata: Record<string, string> = {};
        for (const [name, value] of Object.entries(head.Metadata ?? {})) {
          metadata[name.toLowerCase()] = value;
        }
        return {
          exists: true,
          contentType: head.ContentType ?? null,
          contentLength:
            typeof head.ContentLength === 'number' ? head.ContentLength : null,
          metadata,
        };
      } catch (error) {
        if (isNotFound(error)) {
          return {
            exists: false,
            contentType: null,
            contentLength: null,
            metadata: {},
          };
        }
        throw error;
      }
    },

    async putObject(input: {
      key: string;
      body: Buffer;
      contentType: string;
      metadata?: Record<string, string>;
    }): Promise<PutObjectResult> {
      const head = await store.headObject(input.key);
      if (head.exists) {
        return { wrote: false, preexisting: true };
      }
      await config.client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          Metadata: input.metadata,
        }),
      );
      return { wrote: true, preexisting: false };
    },

    getPublicUrl(key: string): string {
      return `${base}/${key}`;
    },

    async ping(): Promise<boolean> {
      await config.client.send(
        new HeadBucketCommand({ Bucket: config.bucket }),
      );
      return true;
    },

    async listByPrefix(prefix: string): Promise<string[]> {
      const keys: string[] = [];
      let continuationToken: string | undefined;
      do {
        const page = await config.client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        for (const object of page.Contents ?? []) {
          if (object.Key) keys.push(object.Key);
        }
        continuationToken = page.IsTruncated
          ? page.NextContinuationToken
          : undefined;
      } while (continuationToken);
      return keys;
    },

    async deleteObject(key: string): Promise<boolean> {
      try {
        await config.client.send(
          new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    },
  };

  return store;
}
