import type { ValorDinamicoRow } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";
import sql from "@/BBDD/base/db";

export type ValorDinamicoWriteRow = {
  campo_dinamico_id: string;
  valor_texto: string | null;
  valor_numero: number | null;
  valor_fecha: string | null;
  valor_boolean: boolean | null;
};

export const valoresDinamicosRepository = {
  async getByEntidad(ctx: DbContext, entidad: string, entidadId: string) {
    const tenantId = requireTenantId(ctx);
    return queryRows<ValorDinamicoRow>(
      `SELECT * FROM valores_dinamicos
       WHERE tenant_id = $1 AND entidad = $2 AND entidad_id = $3`,
      [tenantId, entidad, entidadId],
    );
  },

  async replaceForEntidad(
    ctx: DbContext,
    entidad: string,
    entidadId: string,
    rows: ValorDinamicoWriteRow[],
  ) {
    const tenantId = requireTenantId(ctx);
    await sql.begin(async (tx) => {
      await tx.unsafe(
        `DELETE FROM valores_dinamicos
         WHERE tenant_id = $1 AND entidad = $2 AND entidad_id = $3`,
        [tenantId, entidad, entidadId],
      );
      for (const row of rows) {
        await tx.unsafe(
          `INSERT INTO valores_dinamicos (
             tenant_id, entidad, entidad_id, campo_dinamico_id,
             valor_texto, valor_numero, valor_fecha, valor_boolean
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            tenantId,
            entidad,
            entidadId,
            row.campo_dinamico_id,
            row.valor_texto,
            row.valor_numero,
            row.valor_fecha,
            row.valor_boolean,
          ],
        );
      }
    });
  },
};
