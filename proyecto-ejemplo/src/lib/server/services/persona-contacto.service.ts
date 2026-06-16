import { personaContactoRepository } from "@/BBDD/repositories/persona-contacto.repository";
import { personaRepository } from "@/BBDD/repositories/persona.repository";
import { normalizeContactoValor } from "@/lib/validation/schemas/persona-contacto.schema";

import type { ServerContext } from "@/lib/server/context/types";

type Ctx = ServerContext;

async function assertPersonaBelongsToTenant(ctx: Ctx, personaId: string) {
  const persona = await personaRepository.getById(ctx, personaId);
  if (!persona) throw new Error("Persona no encontrada");
}

export const personaContactoService = {
  async getAll(ctx: Ctx, personaId: string) {
    await assertPersonaBelongsToTenant(ctx, personaId);
    return personaContactoRepository.getAllByPersona(ctx, personaId);
  },

  async create(ctx: Ctx, personaId: string, payload: {
    canal: string;
    categoria: string;
    valor: string;
    descripcion?: string | null;
    predeterminado: boolean;
    verificado: boolean;
    pais_codigo: string;
  }) {
    await assertPersonaBelongsToTenant(ctx, personaId);

    const normalizedValor = normalizeContactoValor(
      payload.canal as any,
      payload.valor,
      payload.pais_codigo,
    );

    const contacto = await personaContactoRepository.create(ctx, personaId, {
      ...payload,
      valor: normalizedValor,
    });

    // If marked predeterminado, enforce uniqueness
    if (payload.predeterminado) {
      await personaContactoRepository.setPredeterminado(
        ctx,
        contacto.id,
        personaId,
        payload.canal,
      );
    }

    return contacto;
  },

  async update(ctx: Ctx, personaId: string, contactoId: string, payload: {
    canal?: string;
    categoria?: string;
    valor?: string;
    descripcion?: string | null;
    predeterminado?: boolean;
    verificado?: boolean;
    pais_codigo?: string;
  }) {
    await assertPersonaBelongsToTenant(ctx, personaId);

    const normalizedPayload = { ...payload };
    if (payload.valor && payload.canal) {
      normalizedPayload.valor = normalizeContactoValor(
        payload.canal as any,
        payload.valor,
        payload.pais_codigo ?? "AR",
      );
    }

    const contacto = await personaContactoRepository.update(ctx, contactoId, normalizedPayload);

    // If marked predeterminado, enforce uniqueness
    if (payload.predeterminado && contacto.canal) {
      await personaContactoRepository.setPredeterminado(
        ctx,
        contactoId,
        personaId,
        contacto.canal,
      );
    }

    return contacto;
  },

  async delete(ctx: Ctx, personaId: string, contactoId: string) {
    await assertPersonaBelongsToTenant(ctx, personaId);
    await personaContactoRepository.delete(ctx, contactoId);
  },

  async setPredeterminado(ctx: Ctx, personaId: string, contactoId: string, canal: string) {
    await assertPersonaBelongsToTenant(ctx, personaId);
    await personaContactoRepository.setPredeterminado(ctx, contactoId, personaId, canal);
  },
};
