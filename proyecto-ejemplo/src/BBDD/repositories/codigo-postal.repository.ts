import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type CodigoPostalRow = {
  id: string;
  localidad_id: string;
  codigo_postal: string;
};

export const codigoPostalRepository = {
  async getAllByLocalidad(
    _ctx: DbContext,
    localidadId: string,
  ): Promise<CodigoPostalRow[]> {
    return queryRows<CodigoPostalRow>(
      `SELECT id, localidad_id, codigo_postal
       FROM codigos_postales
       WHERE localidad_id = $1
       ORDER BY codigo_postal ASC`,
      [localidadId],
    );
  },
};
