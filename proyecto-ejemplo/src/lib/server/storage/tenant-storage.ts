import { getTenantFilesBucketName } from "./s3-config";
import { objectStorage } from "./object-storage";

export function buildTenantLogoKey(tenantId: string): string {
  return `${tenantId}/logo.jpg`;
}

export function buildUsuarioFotoKey(tenantId: string, usuarioId: string): string {
  return `${tenantId}/usuarios/${usuarioId}.jpg`;
}

export const tenantStorage = {
  async putLogo(tenantId: string, body: Uint8Array): Promise<string> {
    const key = buildTenantLogoKey(tenantId);
    await objectStorage.putObject({
      bucket: getTenantFilesBucketName(),
      key,
      body,
      contentType: "image/jpeg",
    });
    return key;
  },

  async getLogo(tenantId: string) {
    return objectStorage.getObjectBytes(
      getTenantFilesBucketName(),
      buildTenantLogoKey(tenantId),
    );
  },

  async logoExists(tenantId: string): Promise<boolean> {
    return objectStorage.objectExists(
      getTenantFilesBucketName(),
      buildTenantLogoKey(tenantId),
    );
  },

  async deleteLogo(tenantId: string): Promise<void> {
    await objectStorage.deleteObject(
      getTenantFilesBucketName(),
      buildTenantLogoKey(tenantId),
    );
  },
};

export const usuarioStorage = {
  async putFoto(
    tenantId: string,
    usuarioId: string,
    body: Uint8Array,
  ): Promise<string> {
    const key = buildUsuarioFotoKey(tenantId, usuarioId);
    await objectStorage.putObject({
      bucket: getTenantFilesBucketName(),
      key,
      body,
      contentType: "image/jpeg",
    });
    return key;
  },

  async getFoto(tenantId: string, usuarioId: string) {
    return objectStorage.getObjectBytes(
      getTenantFilesBucketName(),
      buildUsuarioFotoKey(tenantId, usuarioId),
    );
  },

  async fotoExists(tenantId: string, usuarioId: string): Promise<boolean> {
    return objectStorage.objectExists(
      getTenantFilesBucketName(),
      buildUsuarioFotoKey(tenantId, usuarioId),
    );
  },

  async deleteFoto(tenantId: string, usuarioId: string): Promise<void> {
    await objectStorage.deleteObject(
      getTenantFilesBucketName(),
      buildUsuarioFotoKey(tenantId, usuarioId),
    );
  },
};
