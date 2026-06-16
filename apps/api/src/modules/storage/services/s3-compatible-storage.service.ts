import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { SIGNED_UPLOAD_URL_EXPIRES_SECONDS } from '../storage.constants';
import { getStorageConfig, isStorageConfigured } from '../storage.config';
import type {
  SignedUploadUrlResult,
  StorageService,
} from '../storage.interface';

@Injectable()
export class S3CompatibleStorageService implements StorageService {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private publicUrlBase: string | null = null;

  private ensureClient(): {
    client: S3Client;
    bucket: string;
    publicUrlBase: string;
  } {
    if (!this.client || !this.bucket || !this.publicUrlBase) {
      const config = getStorageConfig();

      this.client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.bucket = config.bucket;
      this.publicUrlBase = config.publicUrl;
    }

    return {
      client: this.client,
      bucket: this.bucket,
      publicUrlBase: this.publicUrlBase,
    };
  }

  async getSignedUploadUrl(
    storageKey: string,
    mimeType: string,
  ): Promise<SignedUploadUrlResult> {
    const { client, bucket, publicUrlBase } = this.ensureClient();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: SIGNED_UPLOAD_URL_EXPIRES_SECONDS,
    });

    return {
      uploadUrl,
      storageKey,
      publicUrl: this.buildPublicUrl(storageKey, publicUrlBase),
    };
  }

  getPublicUrl(storageKey: string): string {
    if (isStorageConfigured()) {
      const { publicUrlBase } = this.ensureClient();
      return this.buildPublicUrl(storageKey, publicUrlBase);
    }

    const publicUrl = process.env.STORAGE_PUBLIC_URL?.trim()?.replace(/\/$/, '');
    if (!publicUrl) {
      throw new Error('Storage public URL is not configured');
    }

    return this.buildPublicUrl(storageKey, publicUrl);
  }

  async deleteObject(storageKey: string): Promise<void> {
    const { client, bucket } = this.ensureClient();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
    );
  }

  private buildPublicUrl(storageKey: string, publicUrlBase: string): string {
    return `${publicUrlBase}/${storageKey}`;
  }
}
