import type { ServerContext } from "@/lib/server/context/types";
import { jurisdiccionRepository } from "@/BBDD/repositories/jurisdiccion.repository";

type Ctx = ServerContext;

export const jurisdiccionService = {
  async getAll(ctx: Ctx) {
    return jurisdiccionRepository.getAll(ctx);
  },
};
