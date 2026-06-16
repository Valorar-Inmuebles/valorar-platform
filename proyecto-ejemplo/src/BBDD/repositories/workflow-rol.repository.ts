import type { DbContext } from "@/BBDD/base/types";
import { queryRows } from "@/BBDD/base/query";

export type WorkflowRolRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

export const workflowRolRepository = {
  async getAllActive(_ctx: DbContext): Promise<WorkflowRolRow[]> {
    return queryRows<WorkflowRolRow>(
      `SELECT id, nombre, descripcion, orden
       FROM workflow_rol
       WHERE activo = true
       ORDER BY orden ASC, nombre ASC`,
    );
  },
};
