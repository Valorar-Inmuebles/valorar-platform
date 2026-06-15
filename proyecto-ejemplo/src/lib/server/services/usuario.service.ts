import { randomUUID } from "crypto";

import type { ServerContext } from "@/lib/server/context/types";
import { NotFoundError } from "@/lib/server/not-found-error";
import {
  personaDisplayName,
  unwrapOne,
} from "@/lib/server/utils/persona-display-name";
import { credencialRepository } from "@/BBDD/auth/credencial.repository";
import { personaRepository } from "@/BBDD/repositories/persona.repository";
import { rolRepository } from "@/BBDD/repositories/rol.repository";
import {
  usuarioRepository,
  type UsuarioDetailQueryRow,
  type UsuarioListQueryRow,
} from "@/BBDD/repositories/usuario.repository";
import type {
  CreateUsuarioOutput,
  UpdateUsuarioOutput,
} from "@/lib/validation/schemas/usuario.schema";
import { authService } from "@/lib/server/services/auth.service";
import { isSuperUsuario, SUPER_TENANT_ID } from "@/lib/auth/super-tenant";
import { tenantRepository } from "@/BBDD/repositories/tenant.repository";
import { usuarioStorage } from "@/lib/server/storage/tenant-storage";
import { StorageObjectNotFoundError } from "@/lib/server/storage/errors";
import {
  ProfileImageValidationError,
  validateProfileImageFile,
} from "@/lib/server/utils/validate-profile-image";

type Ctx = ServerContext;

type UsuarioRepoCtx = { tenant_id: string; is_superadmin?: boolean };

export type UsuarioListItem = {
  id: string;
  nombre_completo: string;
  email: string;
  roles: string[];
  activo: boolean;
  created_at: string | null;
  ultimo_login_at: string | null;
  tenant_nombre?: string | null;
};

export type UsuarioDetail = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol_ids: string[];
  activo: boolean;
  tenant_id?: string | null;
  has_foto: boolean;
};

export type RolOption = {
  id: string;
  nombre: string;
};

export class UsuarioFieldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UsuarioFieldError";
  }
}

function requireTenantCtx(ctx: Ctx): UsuarioRepoCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

function resolveTargetTenantCtx(
  ctx: Ctx,
  targetTenantId?: string,
): UsuarioRepoCtx {
  if (isSuperUsuario(ctx)) {
    if (!targetTenantId || targetTenantId === SUPER_TENANT_ID) {
      throw new UsuarioFieldError(
        "Seleccioná un tenant.",
        "tenant_id",
        "REQUIRED",
      );
    }
    return { tenant_id: targetTenantId, is_superadmin: true };
  }

  if (targetTenantId && targetTenantId !== ctx.tenant_id) {
    throw new Error("No autorizado");
  }

  return requireTenantCtx(ctx);
}

async function assertTenantExists(tenantId: string) {
  try {
    await tenantRepository.getById({ tenant_id: null }, tenantId);
  } catch {
    throw new UsuarioFieldError(
      "El tenant seleccionado no existe.",
      "tenant_id",
      "INVALID_TENANT",
    );
  }
}

async function resolveUsuarioRepoCtx(
  ctx: Ctx,
  usuarioId: string,
): Promise<UsuarioRepoCtx> {
  if (isSuperUsuario(ctx)) {
    const tenantId = await usuarioRepository.getTenantIdByUsuarioId(usuarioId);
    if (!tenantId) throw new NotFoundError("Usuario no encontrado");
    return { tenant_id: tenantId, is_superadmin: true };
  }
  return requireTenantCtx(ctx);
}

async function findUsuarioDetailRow(ctx: Ctx, id: string) {
  if (isSuperUsuario(ctx)) {
    return usuarioRepository.getByIdGlobal(id);
  }
  return usuarioRepository.getById(requireTenantCtx(ctx), id);
}

function extractRoleNames(
  row: UsuarioListQueryRow | UsuarioDetailQueryRow,
): string[] {
  const entries = row.usuario_rol ?? [];
  const names: string[] = [];

  for (const entry of entries) {
    const rol = unwrapOne(entry.rol);
    if (!rol?.nombre) continue;
    names.push(rol.nombre);
  }

  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "es"));
}

function extractRoleIds(row: UsuarioDetailQueryRow): string[] {
  const entries = row.usuario_rol ?? [];
  const ids: string[] = [];

  for (const entry of entries) {
    const rol = unwrapOne(entry.rol);
    if (!rol?.id) continue;
    ids.push(rol.id);
  }

  return ids;
}

function serializeTimestamptz(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapListRow(row: UsuarioListQueryRow): UsuarioListItem {
  const persona = unwrapOne(row.persona);

  return {
    id: row.id,
    nombre_completo: personaDisplayName(persona),
    email: row.email ?? "—",
    roles: extractRoleNames(row),
    activo: row.activo ?? true,
    created_at: serializeTimestamptz(row.created_at),
    ultimo_login_at: serializeTimestamptz(row.ultimo_login_at),
    ...(row.tenant_nombre != null ? { tenant_nombre: row.tenant_nombre } : {}),
  };
}

async function assertValidRolIds(rolIds: string[]) {
  const validIds = await rolRepository.findIds(rolIds);
  if (validIds.length !== rolIds.length) {
    throw new UsuarioFieldError(
      "Uno o más roles no son válidos.",
      "rol_ids",
      "INVALID_ROLES",
    );
  }
}

async function assertUniqueEmail(email: string, excludeUsuarioId?: string) {
  const exists = await credencialRepository.emailExists(email, excludeUsuarioId);
  if (exists) {
    throw new UsuarioFieldError(
      "Ya existe un usuario con ese email.",
      "email",
      "DUPLICATE_EMAIL",
    );
  }
}

async function softDeletePersona(ctx: UsuarioRepoCtx, personaId: string) {
  try {
    await personaRepository.delete(ctx, personaId);
  } catch {
    // best-effort rollback
  }
}

function mapProfileImageError(error: unknown, field: string): never {
  if (error instanceof ProfileImageValidationError) {
    throw new UsuarioFieldError(error.message, field, error.code);
  }
  throw error;
}

async function usuarioHasFoto(
  tenantId: string | null | undefined,
  usuarioId: string,
  fotoUrl: string | null | undefined,
): Promise<boolean> {
  if (fotoUrl) return true;
  if (!tenantId) return false;
  try {
    return await usuarioStorage.fotoExists(tenantId, usuarioId);
  } catch {
    return false;
  }
}

async function rollbackCreatedUser(
  ctx: UsuarioRepoCtx,
  userId: string,
  personaId: string | null,
) {
  try {
    await authService.deleteCredential(userId);
  } catch {
    // best-effort rollback
  }

  try {
    await usuarioRepository.deleteById(ctx, userId);
  } catch {
    // best-effort rollback
  }

  if (personaId) {
    await softDeletePersona(ctx, personaId);
  }
}

export const usuarioService = {
  async getAll(ctx: Ctx): Promise<UsuarioListItem[]> {
    const rows = isSuperUsuario(ctx)
      ? await usuarioRepository.getAllGlobal()
      : await usuarioRepository.getAll(requireTenantCtx(ctx));

    return rows.map(mapListRow);
  },

  async listRoles(_ctx: Ctx): Promise<RolOption[]> {
    return rolRepository.listAll();
  },

  async listTenantsForAssign(
    ctx: Ctx,
    options?: { includeSuperTenant?: boolean },
  ): Promise<Array<{ id: string; nombre: string }>> {
    if (!isSuperUsuario(ctx)) {
      throw new Error("No autorizado");
    }

    const tenants = await tenantRepository.getAll({ tenant_id: null });
    if (options?.includeSuperTenant) {
      return tenants;
    }
    return tenants.filter((tenant) => tenant.id !== SUPER_TENANT_ID);
  },

  async getById(ctx: Ctx, id: string): Promise<UsuarioDetail> {
    const row = await findUsuarioDetailRow(ctx, id);
    if (!row) throw new NotFoundError("Usuario no encontrado");

    const persona = unwrapOne(row.persona);

    return {
      id: row.id,
      email: row.email ?? "",
      nombre: persona?.nombre ?? "",
      apellido: persona?.apellido ?? "",
      rol_ids: extractRoleIds(row),
      activo: row.activo ?? true,
      tenant_id: row.tenant_id,
      has_foto: await usuarioHasFoto(row.tenant_id, row.id, row.foto_url),
    };
  },

  async create(ctx: Ctx, input: CreateUsuarioOutput): Promise<{ id: string }> {
    const repoCtx = resolveTargetTenantCtx(ctx, input.tenant_id);
    if (isSuperUsuario(ctx)) {
      await assertTenantExists(repoCtx.tenant_id);
    }

    await assertValidRolIds(input.rol_ids);
    await assertUniqueEmail(input.email);

    const userId = randomUUID();
    let personaId: string | null = null;

    try {
      const persona = await personaRepository.create(repoCtx, {
        tipo: "humana",
        nombre: input.nombre,
        apellido: input.apellido,
      });
      personaId = persona.id;

      await usuarioRepository.create(repoCtx, {
        id: userId,
        persona_id: persona.id,
        activo: input.activo,
      });

      await authService.createCredential({
        usuario_id: userId,
        email: input.email,
        password: input.password,
      });

      await usuarioRepository.replaceRoles(repoCtx, userId, input.rol_ids);

      return { id: userId };
    } catch (err) {
      await rollbackCreatedUser(repoCtx, userId, personaId);
      throw err;
    }
  },

  async update(
    ctx: Ctx,
    id: string,
    input: UpdateUsuarioOutput,
  ): Promise<void> {
    if (!isSuperUsuario(ctx) && input.tenant_id) {
      throw new Error("No autorizado");
    }

    let repoCtx = await resolveUsuarioRepoCtx(ctx, id);
    const row = await findUsuarioDetailRow(ctx, id);
    if (!row) throw new NotFoundError("Usuario no encontrado");

    await assertValidRolIds(input.rol_ids);

    const currentEmail = row.email ?? "";
    if (input.email !== currentEmail) {
      await assertUniqueEmail(input.email, id);
    }

    await authService.updateCredential({
      usuario_id: id,
      email: input.email !== currentEmail ? input.email : undefined,
      password: input.password,
    });

    await personaRepository.update(repoCtx, row.persona_id, {
      tipo: "humana",
      nombre: input.nombre,
      apellido: input.apellido,
    });

    if (isSuperUsuario(ctx)) {
      const targetTenantId = input.tenant_id ?? row.tenant_id;
      if (!targetTenantId) {
        throw new UsuarioFieldError(
          "Seleccioná un tenant.",
          "tenant_id",
          "REQUIRED",
        );
      }

      if (targetTenantId !== SUPER_TENANT_ID) {
        await assertTenantExists(targetTenantId);
      }

      if (targetTenantId !== row.tenant_id) {
        await usuarioRepository.moveToTenant(
          id,
          row.persona_id,
          targetTenantId,
        );
        repoCtx = { tenant_id: targetTenantId, is_superadmin: true };
      }
    }

    if (isSuperUsuario(ctx)) {
      await usuarioRepository.updateActivoById(id, input.activo);
    } else {
      await usuarioRepository.updateActivo(repoCtx, id, input.activo);
    }

    await usuarioRepository.replaceRoles(repoCtx, id, input.rol_ids);
  },

  async setActivo(ctx: Ctx, id: string, activo: boolean): Promise<void> {
    const repoCtx = await resolveUsuarioRepoCtx(ctx, id);

    if (!activo && ctx.user?.id === id) {
      throw new UsuarioFieldError(
        "No podés deshabilitar tu propio usuario.",
        "id",
        "SELF_DEACTIVATE",
      );
    }

    const row = await findUsuarioDetailRow(ctx, id);
    if (!row) throw new NotFoundError("Usuario no encontrado");

    if (isSuperUsuario(ctx)) {
      await usuarioRepository.updateActivoById(id, activo);
    } else {
      await usuarioRepository.updateActivo(repoCtx, id, activo);
    }
  },

  async uploadFoto(ctx: Ctx, id: string, file: File): Promise<void> {
    await resolveUsuarioRepoCtx(ctx, id);
    const row = await findUsuarioDetailRow(ctx, id);
    if (!row?.tenant_id) throw new NotFoundError("Usuario no encontrado");

    let bytes: Uint8Array;
    try {
      bytes = await validateProfileImageFile(file, "foto");
    } catch (error) {
      mapProfileImageError(error, "foto");
    }

    const fotoKey = await usuarioStorage.putFoto(row.tenant_id, id, bytes);
    await usuarioRepository.updateFotoUrl(id, fotoKey);
  },

  async getFoto(ctx: Ctx, id: string) {
    await resolveUsuarioRepoCtx(ctx, id);
    const row = await findUsuarioDetailRow(ctx, id);
    if (!row?.tenant_id) throw new NotFoundError("Usuario no encontrado");

    try {
      return await usuarioStorage.getFoto(row.tenant_id, id);
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        throw new NotFoundError("Foto no encontrada");
      }
      throw error;
    }
  },
};
