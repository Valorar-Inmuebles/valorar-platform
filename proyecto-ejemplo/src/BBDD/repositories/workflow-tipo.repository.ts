import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type WorkflowTipoRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

export const workflowTipoRepository = {
  async getAllActive(_ctx: DbContext): Promise<WorkflowTipoRow[]> {
    return queryRows<WorkflowTipoRow>(
      `SELECT id, nombre, descripcion, orden
       FROM workflow_tipo
       WHERE activo = true
       ORDER BY orden ASC, nombre ASC`,
    );
  },
};
