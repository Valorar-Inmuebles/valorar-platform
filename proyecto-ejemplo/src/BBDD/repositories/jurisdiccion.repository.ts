import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type JurisdiccionRow = {
  id: string;
  nombre: string | null;
  codigo: string | null;
  tipo: string;
};

export const jurisdiccionRepository = {
  async getAll(_ctx: DbContext): Promise<JurisdiccionRow[]> {
    return queryRows<JurisdiccionRow>(
      `SELECT id, nombre, codigo, tipo
       FROM jurisdiccion
       WHERE activo = true
       ORDER BY nombre ASC`,
    );
  },
};
