import type { ServerContext } from "@/lib/server/context/types";
import { fueroRepository } from "@/BBDD/repositories/fuero.repository";

type Ctx = ServerContext;

export const fueroService = {
  async getAll(ctx: Ctx) {
    return fueroRepository.getAll(ctx);
  },
};
