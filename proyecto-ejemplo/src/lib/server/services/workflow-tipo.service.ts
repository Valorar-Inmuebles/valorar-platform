import type { ServerContext } from "@/lib/server/context/types";
import { workflowTipoRepository } from "@/BBDD/repositories/workflow-tipo.repository";

type Ctx = ServerContext;

export const workflowTipoService = {
  async getAllActive(ctx: Ctx) {
    return workflowTipoRepository.getAllActive(ctx);
  },
};
