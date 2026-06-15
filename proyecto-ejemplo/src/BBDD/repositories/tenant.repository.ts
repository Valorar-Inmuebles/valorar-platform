import type { TenantRow } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { getCachedTenantList } from "@/lib/server/cache/tenant-list-cache";
import { queryOne } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

function isMissingColumnError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /column .* does not exist/i.test(error.message)
  );
}

function pickNombrePayload(payload: Record<string, unknown>) {
  return { nombre: payload.nombre };
}

export const tenantRepository = {
  async getAll(_ctx: DbContext) {
    return getCachedTenantList();
  },

  async getById(_ctx: DbContext, id: string) {
    const base = await queryOne<{ id: string; nombre: string }>(
      `SELECT id, nombre FROM tenant WHERE id = $1`,
      [id],
    );
    if (!base) throw new Error("Tenant no encontrado");

    try {
      const contact = await queryOne<{
        email: string | null;
        telefono: string | null;
        logo_url: string | null;
      }>(
        `SELECT email, telefono, logo_url FROM tenant WHERE id = $1`,
        [id],
      );

      return {
        id: base.id,
        nombre: base.nombre,
        email: contact?.email ?? null,
        telefono: contact?.telefono ?? null,
        logo_url: contact?.logo_url ?? null,
      };
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;
      return {
        id: base.id,
        nombre: base.nombre,
        email: null,
        telefono: null,
        logo_url: null,
      };
    }
  },

  async create(_ctx: DbContext, payload: Record<string, unknown>): Promise<TenantRow> {
    try {
      return await tenantRepository.insert(_ctx, payload);
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;
      return tenantRepository.insert(_ctx, pickNombrePayload(payload));
    }
  },

  async insert(_ctx: DbContext, payload: Record<string, unknown>): Promise<TenantRow> {
    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const cols = keys.join(", ");
    const row = await queryOne<TenantRow>(
      `INSERT INTO tenant (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    if (!row) throw new Error("Error al crear tenant");
    return row;
  },

  async update(_ctx: DbContext, id: string, payload: Record<string, unknown>) {
    try {
      await tenantRepository.applyUpdate(id, payload);
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;
      await tenantRepository.applyUpdate(id, pickNombrePayload(payload));
    }
  },

  async applyUpdate(id: string, payload: Record<string, unknown>) {
    const keys = Object.keys(payload);
    if (keys.length === 0) return;
    const values = Object.values(payload);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    await pgQuery(
      `UPDATE tenant SET ${sets} WHERE id = $${keys.length + 1}`,
      [...values, id],
    );
  },

  async delete(_ctx: DbContext, id: string) {
    await pgQuery(`DELETE FROM tenant WHERE id = $1`, [id]);
  },
};
