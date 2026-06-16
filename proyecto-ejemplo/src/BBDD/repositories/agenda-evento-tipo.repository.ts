import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { queryOne, queryRows } from "@/BBDD/base/query";

export const agendaEventoTipoRepository = {
  async listActivosForTenant(ctx: DbContext) {
    const tenantId = requireTenantId(ctx);
    return queryRows(
      `SELECT id, codigo, nombre, color_fondo, color_texto, duracion_default_minutos, orden
       FROM agenda_evento_tipo
       WHERE activo = true
         AND (tenant_id IS NULL OR tenant_id = $1)
       ORDER BY orden ASC, nombre ASC`,
      [tenantId],
    );
  },

  async getByIdForTenant(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    return queryOne(
      `SELECT id, codigo, nombre, color_fondo, color_texto, duracion_default_minutos
       FROM agenda_evento_tipo
       WHERE id = $1
         AND activo = true
         AND (tenant_id IS NULL OR tenant_id = $2)
       LIMIT 1`,
      [id, tenantId],
    );
  },
};
