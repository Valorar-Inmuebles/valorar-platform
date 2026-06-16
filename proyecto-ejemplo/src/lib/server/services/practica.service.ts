import type { ServerContext } from "@/lib/server/context/types";
import { practicaRepository } from "@/BBDD/repositories/practica.repository";

type Ctx = ServerContext;

export const practicaService = {
  async getAll(ctx: Ctx) {
    return practicaRepository.getAll(ctx);
  },
};
