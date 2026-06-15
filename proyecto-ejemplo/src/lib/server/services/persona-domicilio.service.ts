import { personaDomicilioRepository } from "@/BBDD/repositories/persona-domicilio.repository";
import { personaRepository } from "@/BBDD/repositories/persona.repository";

import type { ServerContext } from "@/lib/server/context/types";

type Ctx = ServerContext;

async function assertPersonaBelongsToTenant(ctx: Ctx, personaId: string) {
  const persona = await personaRepository.getById(ctx, personaId);
  if (!persona) throw new Error("Persona no encontrada");
}

export const personaDomicilioService = {
  async getAll(ctx: Ctx, personaId: string) {
    await assertPersonaBelongsToTenant(ctx, personaId);
    return personaDomicilioRepository.getAllByPersona(ctx, personaId);
  },

  async create(ctx: Ctx, personaId: string, payload: {
    categoria: string;
    calle: string;
    numero?: string | null;
    piso?: string | null;
    departamento?: string | null;
    barrio?: string | null;
    localidad_id?: string | null;
    codigo_postal?: string | null;
    descripcion?: string | null;
    predeterminado: boolean;
    activo: boolean;
  }) {
    await assertPersonaBelongsToTenant(ctx, personaId);

    const domicilio = await personaDomicilioRepository.create(ctx, personaId, payload);

    if (payload.predeterminado) {
      await personaDomicilioRepository.setPredeterminado(ctx, domicilio.id, personaId);
    }

    return domicilio;
  },

  async update(ctx: Ctx, personaId: string, domicilioId: string, payload: {
    categoria?: string;
    calle?: string;
    numero?: string | null;
    piso?: string | null;
    departamento?: string | null;
    barrio?: string | null;
    localidad_id?: string | null;
    codigo_postal?: string | null;
    descripcion?: string | null;
    predeterminado?: boolean;
    activo?: boolean;
  }) {
    await assertPersonaBelongsToTenant(ctx, personaId);

    const domicilio = await personaDomicilioRepository.update(ctx, domicilioId, payload);

    if (payload.predeterminado) {
      await personaDomicilioRepository.setPredeterminado(ctx, domicilioId, personaId);
    }

    return domicilio;
  },

  async delete(ctx: Ctx, personaId: string, domicilioId: string) {
    await assertPersonaBelongsToTenant(ctx, personaId);
    await personaDomicilioRepository.delete(ctx, domicilioId);
  },

  async setPredeterminado(ctx: Ctx, personaId: string, domicilioId: string) {
    await assertPersonaBelongsToTenant(ctx, personaId);
    await personaDomicilioRepository.setPredeterminado(ctx, domicilioId, personaId);
  },
};
