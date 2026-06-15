import { StorageConfigError } from "./errors";

export type S3Config = {
  region: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  bucketAnses: string;
  bucketDocuments: string | undefined;
  bucketTenantFiles: string;
};

function parseForcePathStyle(): boolean {
  const raw = process.env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  return true;
}

export function getS3Config(): S3Config {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.S3_REGION?.trim() || "auto";
  const bucketAnses = process.env.S3_BUCKET_ANSES?.trim() || "anses";

  if (!accessKeyId || !secretAccessKey) {
    throw new StorageConfigError(
      "Faltan S3_ACCESS_KEY_ID o S3_SECRET_ACCESS_KEY para object storage",
    );
  }

  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const bucketDocuments = process.env.S3_BUCKET_DOCUMENTS?.trim() || undefined;
  const bucketTenantFiles =
    process.env.S3_BUCKET_TENANT_FILES?.trim() || "tenant_files";

  return {
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: parseForcePathStyle(),
    bucketAnses,
    bucketDocuments,
    bucketTenantFiles,
  };
}

export function getAnsesBucketName(): string {
  return getS3Config().bucketAnses;
}

export function getDocumentsBucketName(): string {
  const bucket = getS3Config().bucketDocuments;
  if (!bucket) {
    throw new StorageConfigError(
      "Falta S3_BUCKET_DOCUMENTS para almacenar documentos",
    );
  }
  return bucket;
}

export function getTenantFilesBucketName(): string {
  return getS3Config().bucketTenantFiles;
}
