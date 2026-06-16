import type { ServerContext } from "@/lib/server/context/types";
import { objetoRepository } from "@/BBDD/repositories/objeto.repository";

type Ctx = ServerContext;

export const objetoService = {
  async getAllByFuero(ctx: Ctx, fueroId: string) {
    return objetoRepository.getAllByFuero(ctx, fueroId);
  },

  async getById(ctx: Ctx, id: string) {
    return objetoRepository.getById(ctx, id);
  },
};
