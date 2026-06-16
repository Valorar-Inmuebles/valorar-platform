import { unstable_cache } from "next/cache";

import { queryOne } from "@/BBDD/base/query";

const TENANT_NOMBRE_CACHE_TTL_SECONDS = 300;
const TENANT_NOMBRE_MEMORY_TTL_MS = TENANT_NOMBRE_CACHE_TTL_SECONDS * 1000;

type TenantNombreCacheEntry = {
  nombre: string;
  expiresAt: number;
};

const tenantNombreMemoryCache = new Map<string, TenantNombreCacheEntry>();

function tenantNombreCacheTag(tenantId: string): string {
  return `tenant-nombre-${tenantId}`;
}

function getTenantNombreFromMemory(tenantId: string): { nombre: string } | null {
  const cached = tenantNombreMemoryCache.get(tenantId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    tenantNombreMemoryCache.delete(tenantId);
    return null;
  }
  return { nombre: cached.nombre };
}

function setTenantNombreInMemory(tenantId: string, nombre: string): void {
  tenantNombreMemoryCache.set(tenantId, {
    nombre,
    expiresAt: Date.now() + TENANT_NOMBRE_MEMORY_TTL_MS,
  });
}

async function queryTenantNombre(tenantId: string): Promise<{ nombre: string } | null> {
  return queryOne<{ nombre: string }>(
    `SELECT nombre FROM tenant WHERE id = $1`,
    [tenantId],
  );
}

function getTenantNombreFromNextCache(
  tenantId: string,
): Promise<{ nombre: string } | null> {
  return unstable_cache(
    () => queryTenantNombre(tenantId),
    ["tenant-nombre-v1", tenantId],
    {
      revalidate: TENANT_NOMBRE_CACHE_TTL_SECONDS,
      tags: [tenantNombreCacheTag(tenantId)],
    },
  )();
}

export type ContextUsuarioRow = {
  id: string;
  tenant_id: string | null;
  foto_url: string | null;
  persona: {
    tipo: string | null;
    nombre: string | null;
    apellido: string | null;
  } | null;
};

export type ContextBundleRow = ContextUsuarioRow & {
  roles: string[];
  tenant: { nombre: string } | null;
};

function parseRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is string => typeof r === "string");
}

export const contextRepository = {
  async getContextByUserId(userId: string): Promise<ContextBundleRow | null> {
    const row = await queryOne<{
      id: string;
      tenant_id: string | null;
      foto_url: string | null;
      persona: ContextUsuarioRow["persona"];
      roles: unknown;
      tenant_nombre: string | null;
    }>(
      `SELECT
         u.id,
         u.tenant_id,
         u.foto_url,
         json_build_object(
           'tipo', p.tipo,
           'nombre', p.nombre,
           'apellido', p.apellido
         ) AS persona,
         COALESCE(
           json_agg(DISTINCT r.nombre) FILTER (WHERE r.nombre IS NOT NULL),
           '[]'::json
         ) AS roles,
         t.nombre AS tenant_nombre
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
       LEFT JOIN rol r ON r.id = ur.rol_id
       LEFT JOIN tenant t ON t.id = u.tenant_id
       WHERE u.id = $1
       GROUP BY u.id, u.tenant_id, p.tipo, p.nombre, p.apellido, t.nombre`,
      [userId],
    );

    if (!row) return null;

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      foto_url: row.foto_url,
      persona: row.persona,
      roles: parseRoles(row.roles),
      tenant: row.tenant_nombre ? { nombre: row.tenant_nombre } : null,
    };
  },

  async getUsuarioByUserId(userId: string): Promise<ContextUsuarioRow | null> {
    return queryOne<ContextUsuarioRow>(
      `SELECT
         u.id,
         u.tenant_id,
         u.foto_url,
         json_build_object(
           'tipo', p.tipo,
           'nombre', p.nombre,
           'apellido', p.apellido
         ) AS persona
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       WHERE u.id = $1`,
      [userId],
    );
  },

  async getRolesByUsuarioId(userId: string): Promise<string[]> {
    const bundle = await this.getContextByUserId(userId);
    return bundle?.roles ?? [];
  },

  async getTenantNombre(tenantId: string): Promise<{ nombre: string } | null> {
    const fromMemory = getTenantNombreFromMemory(tenantId);
    if (fromMemory) return fromMemory;

    const row = await getTenantNombreFromNextCache(tenantId);
    if (row) {
      setTenantNombreInMemory(tenantId, row.nombre);
    }
    return row;
  },
};
