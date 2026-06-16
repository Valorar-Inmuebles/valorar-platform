import type { ServerContext } from "@/lib/server/context/types";
import { workflowRolRepository } from "@/BBDD/repositories/workflow-rol.repository";

type Ctx = ServerContext;

export const workflowRolService = {
  async getAllActive(ctx: Ctx) {
    return workflowRolRepository.getAllActive(ctx);
  },
};
