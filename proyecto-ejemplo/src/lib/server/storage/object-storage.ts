import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import { StorageObjectNotFoundError } from "./errors";
import { getS3Client } from "./s3-client";
import type { PutObjectInput, StoredObject } from "./types";

function isObjectNotFound(error: unknown): boolean {
  if (error instanceof NoSuchKey || error instanceof NotFound) return true;
  if (error instanceof S3ServiceException) {
    return error.name === "NoSuchKey" || error.$metadata.httpStatusCode === 404;
  }
  return false;
}

function toBodyBytes(body: PutObjectInput["body"]): Uint8Array | Buffer | string {
  return body;
}

export const objectStorage = {
  async getObjectBytes(bucket: string, key: string): Promise<StoredObject> {
    try {
      const response = await getS3Client().send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );

      if (!response.Body) {
        throw new StorageObjectNotFoundError(key, bucket);
      }

      const content = await response.Body.transformToByteArray();

      return {
        content,
        contentType: response.ContentType ?? null,
        contentLength: response.ContentLength ?? content.byteLength,
      };
    } catch (error) {
      if (isObjectNotFound(error)) {
        throw new StorageObjectNotFoundError(key, bucket);
      }
      throw error;
    }
  },

  async getObjectText(bucket: string, key: string): Promise<string> {
    const stored = await this.getObjectBytes(bucket, key);
    return new TextDecoder().decode(stored.content);
  },

  async putObject(input: PutObjectInput): Promise<void> {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: toBodyBytes(input.body),
        ContentType: input.contentType,
      }),
    );
  },

  async deleteObject(bucket: string, key: string): Promise<void> {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  },

  async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      await getS3Client().send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return true;
    } catch (error) {
      if (isObjectNotFound(error)) return false;
      throw error;
    }
  },
};
