import type { ServerContext } from "@/lib/server/context/types";
import { codigoPostalRepository } from "@/BBDD/repositories/codigo-postal.repository";

type Ctx = ServerContext;

export const codigoPostalService = {
  async getAllByLocalidad(ctx: Ctx, localidadId: string) {
    return codigoPostalRepository.getAllByLocalidad(ctx, localidadId);
  },
};
