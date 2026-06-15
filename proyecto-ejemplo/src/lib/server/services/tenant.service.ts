import type { ServerContext } from "@/lib/server/context/types";
import { invalidateTenantListCache } from "@/lib/server/cache/tenant-list-cache";
import { NotFoundError } from "@/lib/server/not-found-error";
import { tenantRepository } from "@/BBDD/repositories/tenant.repository";
import {
  assertSuperUsuario,
  SUPER_TENANT_ID,
} from "@/lib/auth/super-tenant";
import {
  tenantFormSchema,
  type TenantFormOutput,
} from "@/lib/validation/schemas/tenant.schema";
import {
  buildTenantLogoKey,
  tenantStorage,
} from "@/lib/server/storage/tenant-storage";
import { StorageObjectNotFoundError } from "@/lib/server/storage/errors";
import {
  ProfileImageValidationError,
  validateProfileImageFile,
} from "@/lib/server/utils/validate-profile-image";

type Ctx = ServerContext;

export type TenantListItem = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
};

export type TenantDetail = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  has_logo: boolean;
};

export class TenantFieldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TenantFieldError";
  }
}

function requireSuper(ctx: Ctx) {
  assertSuperUsuario(ctx);
}

function mapProfileImageError(error: unknown, field: string): never {
  if (error instanceof ProfileImageValidationError) {
    throw new TenantFieldError(error.message, field, error.code);
  }
  throw error;
}

function parsePayload(payload: unknown): TenantFormOutput {
  return tenantFormSchema.parse(payload);
}

function toInsertPayload(data: TenantFormOutput) {
  return {
    nombre: data.nombre,
    email: data.email ?? null,
    telefono: data.telefono ?? null,
  };
}

async function tenantHasLogo(
  tenantId: string,
  logoUrl: string | null | undefined,
): Promise<boolean> {
  if (logoUrl) return true;
  try {
    return await tenantStorage.logoExists(tenantId);
  } catch {
    return false;
  }
}

export const tenantService = {
  async getAll(ctx: Ctx): Promise<TenantListItem[]> {
    requireSuper(ctx);
    const rows = await tenantRepository.getAll(ctx);
    return rows
      .filter((row) => row.id !== SUPER_TENANT_ID)
      .map((row) => ({
        id: row.id,
        nombre: row.nombre,
        email: row.email ?? null,
        telefono: row.telefono ?? null,
      }));
  },

  async getById(ctx: Ctx, id: string): Promise<TenantDetail> {
    requireSuper(ctx);
    const row = await tenantRepository.getById(ctx, id);
    return {
      id: row.id,
      nombre: row.nombre,
      email: row.email ?? null,
      telefono: row.telefono ?? null,
      has_logo: await tenantHasLogo(id, row.logo_url),
    };
  },

  async create(ctx: Ctx, payload: unknown) {
    requireSuper(ctx);
    const data = parsePayload(payload);
    const created = await tenantRepository.create(ctx, toInsertPayload(data));
    invalidateTenantListCache();
    return created;
  },

  async update(ctx: Ctx, id: string, payload: unknown) {
    requireSuper(ctx);
    const data = parsePayload(payload);
    await tenantRepository.getById(ctx, id);
    await tenantRepository.update(ctx, id, toInsertPayload(data));
    invalidateTenantListCache();
  },

  async uploadLogo(ctx: Ctx, tenantId: string, file: File): Promise<void> {
    requireSuper(ctx);
    await tenantRepository.getById(ctx, tenantId);

    let bytes: Uint8Array;
    try {
      bytes = await validateProfileImageFile(file, "logo");
    } catch (error) {
      mapProfileImageError(error, "logo");
    }

    const logoKey = await tenantStorage.putLogo(tenantId, bytes);
    await tenantRepository.update(ctx, tenantId, { logo_url: logoKey });
    invalidateTenantListCache();
  },

  async getLogo(ctx: Ctx, tenantId: string) {
    requireSuper(ctx);
    await tenantRepository.getById(ctx, tenantId);

    try {
      return await tenantStorage.getLogo(tenantId);
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        throw new NotFoundError("Logo no encontrado");
      }
      throw error;
    }
  },

  async delete(ctx: Ctx, id: string) {
    requireSuper(ctx);
    if (id === SUPER_TENANT_ID) {
      throw new Error("No se puede eliminar el tenant del sistema");
    }
    try {
      await tenantRepository.getById(ctx, id);
    } catch {
      throw new NotFoundError("Tenant no encontrado");
    }

    try {
      await tenantStorage.deleteLogo(id);
    } catch (error) {
      if (!(error instanceof StorageObjectNotFoundError)) {
        throw error;
      }
    }

    await tenantRepository.delete(ctx, id);
    invalidateTenantListCache();
  },
};

export { buildTenantLogoKey };