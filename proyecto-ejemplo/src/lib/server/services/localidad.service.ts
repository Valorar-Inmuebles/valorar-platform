import type { ServerContext } from "@/lib/server/context/types";
import { localidadRepository } from "@/BBDD/repositories/localidad.repository";

type Ctx = ServerContext;

export const localidadService = {
  async search(ctx: Ctx, provinciaId: string, query: string, limit = 50) {
    return localidadRepository.search(ctx, provinciaId, query, limit);
  },

  async getAllByProvincia(ctx: Ctx, provinciaId: string) {
    return localidadRepository.getAllByProvincia(ctx, provinciaId);
  },
};
