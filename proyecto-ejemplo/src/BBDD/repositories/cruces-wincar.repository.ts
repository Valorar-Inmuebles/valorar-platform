import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type CruceWinCarRow = {
  id: number;
  carpetaid: string;
  centroid: number | null;
  estadoid: number | null;
  fechainicio: string | null;
  fechaestado: string | null;
  cliente: string | null;
  ccuitdocumento: number | null;
  pexpedientenumero: number | null;
  pexpedienteanio: number | null;
  ceseid: number | null;
  estadoanseid: number | null;
  abeneficiocaja: number | null;
  atipobeneficio: number | null;
  abeneficio: number | null;
  abeneficiocopar: number | null;
};

const SELECT_FIELDS = `
  id,
  carpetaid,
  centroid,
  estadoid,
  fechainicio,
  fechaestado,
  cliente,
  ccuitdocumento,
  pexpedientenumero,
  pexpedienteanio,
  ceseid,
  estadoanseid,
  abeneficiocaja,
  atipobeneficio,
  abeneficio,
  abeneficiocopar
`;

export const crucesWinCarRepository = {
  async getAll(_ctx: DbContext): Promise<CruceWinCarRow[]> {
    return queryRows<CruceWinCarRow>(
      `SELECT ${SELECT_FIELDS} FROM cruces_wincar ORDER BY id`,
    );
  },
};
