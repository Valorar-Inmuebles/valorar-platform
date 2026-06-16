import { getDocumentsBucketName } from "./s3-config";
import { objectStorage } from "./object-storage";
import type { PutObjectInput } from "./types";

/**
 * Key S3 para documentos del módulo:
 * {tenant_id}/{entidad_tipo}/{entidad_id}/documentos/{documento_id}.{extension}
 */
export function buildDocumentStorageKey(params: {
  tenantId: string;
  entidadTipo: string;
  entidadId: string;
  documentoId: string;
  extension: string;
}): string {
  const ext = params.extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${params.tenantId}/${params.entidadTipo}/${params.entidadId}/documentos/${params.documentoId}.${ext}`;
}

export const documentStorage = {
  async putObject(
    key: string,
    body: PutObjectInput["body"],
    contentType?: string,
  ): Promise<void> {
    await objectStorage.putObject({
      bucket: getDocumentsBucketName(),
      key,
      body,
      contentType,
    });
  },

  async getFile(key: string, bucket?: string) {
    return objectStorage.getObjectBytes(bucket ?? getDocumentsBucketName(), key);
  },

  async deleteObject(key: string, bucket?: string): Promise<void> {
    await objectStorage.deleteObject(bucket ?? getDocumentsBucketName(), key);
  },
};
