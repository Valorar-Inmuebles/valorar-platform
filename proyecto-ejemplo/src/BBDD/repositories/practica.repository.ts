import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type PracticaRow = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  orden: number | null;
};

export const practicaRepository = {
  async getAll(_ctx: DbContext): Promise<PracticaRow[]> {
    return queryRows<PracticaRow>(
      `SELECT id, nombre, codigo, descripcion, orden
       FROM practica
       WHERE activo = true
       ORDER BY orden ASC, nombre ASC`,
    );
  },
};
