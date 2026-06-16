import type { ObjetoRow } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { queryOne, queryRows } from "@/BBDD/base/query";

export type { ObjetoRow };

export const objetoRepository = {
  async getAllByFuero(_ctx: DbContext, fueroId: string): Promise<ObjetoRow[]> {
    return queryRows<ObjetoRow>(
      `SELECT id, fuero_id, nombre
       FROM objeto
       WHERE fuero_id = $1
       ORDER BY nombre ASC`,
      [fueroId],
    );
  },

  async getById(_ctx: DbContext, id: string): Promise<ObjetoRow | null> {
    return queryOne<ObjetoRow>(
      `SELECT id, fuero_id, nombre FROM objeto WHERE id = $1`,
      [id],
    );
  },
};
