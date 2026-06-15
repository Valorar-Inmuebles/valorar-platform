import type { LocalidadRow } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { ilikePattern } from "@/BBDD/base/helpers";
import { queryRows } from "@/BBDD/base/query";

export type { LocalidadRow };

export const localidadRepository = {
  async search(
    _ctx: DbContext,
    provinciaId: string,
    query: string,
    limit = 50,
  ): Promise<LocalidadRow[]> {
    return queryRows<LocalidadRow>(
      `SELECT id, provincia_id, nombre
       FROM localidades
       WHERE provincia_id = $1 AND nombre ILIKE $2
       ORDER BY nombre ASC
       LIMIT $3`,
      [provinciaId, ilikePattern(query), limit],
    );
  },

  async getAllByProvincia(
    _ctx: DbContext,
    provinciaId: string,
  ): Promise<LocalidadRow[]> {
    return queryRows<LocalidadRow>(
      `SELECT id, provincia_id, nombre
       FROM localidades
       WHERE provincia_id = $1
       ORDER BY nombre ASC`,
      [provinciaId],
    );
  },
};
