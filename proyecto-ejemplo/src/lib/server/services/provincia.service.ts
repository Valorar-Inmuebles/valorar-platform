import type { ServerContext } from "@/lib/server/context/types";
import { provinciaRepository } from "@/BBDD/repositories/provincia.repository";

type Ctx = ServerContext;

export const provinciaService = {
  async getAll(ctx: Ctx) {
    return provinciaRepository.getAll(ctx);
  },
};
