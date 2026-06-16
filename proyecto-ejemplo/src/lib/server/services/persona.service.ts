import { personaRepository } from "@/BBDD/repositories/persona.repository";
import { personaContactoRepository } from "@/BBDD/repositories/persona-contacto.repository";
import { personaDomicilioRepository } from "@/BBDD/repositories/persona-domicilio.repository";
import { normalizeContactoValor } from "@/lib/validation/schemas/persona-contacto.schema";

type PersonaPayload = Record<string, unknown>;

/**
 * Structured field error thrown by the service for validation failures
 * that must be surfaced to a specific form field in the UI.
 */
export class PersonaFieldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "PersonaFieldError";
  }
}

/**
 * Strips fields that do not belong to the given tipo.
 * Ensures humana personas never persist cuit, and juridica personas
 * never persist apellido/documento/cuil/sexo/fecha_nacimiento.
 */
function stripPayloadByTipo(payload: PersonaPayload): PersonaPayload {
  if (payload.tipo === "humana") {
    return { ...payload, cuit: null };
  }
  if (payload.tipo === "juridica") {
    return {
      ...payload,
      apellido: null,
      documento: null,
      cuil: null,
      sexo: null,
      fecha_nacimiento: null,
    };
  }
  return payload;
}

/**
 * Checks uniqueness of documento, cuil, and cuit within the same tenant.
 * Pass excludeId when updating so the record does not conflict with itself.
 */
async function checkUniqueness(
  ctx: unknown,
  payload: PersonaPayload,
  excludeId?: string
) {
  if (payload.documento) {
    const dup = await personaRepository.findByDocumento(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx as any,
      payload.documento as string,
      excludeId
    );
    if (dup) throw new PersonaFieldError("Ya existe una persona con ese DNI.", "documento", "DUPLICATE_DOCUMENTO");
  }
  if (payload.cuil) {
    const dup = await personaRepository.findByCuil(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx as any,
      payload.cuil as string,
      excludeId
    );
    if (dup) throw new PersonaFieldError("Ya existe una persona con ese CUIL.", "cuil", "DUPLICATE_CUIL");
  }
  if (payload.cuit) {
    const dup = await personaRepository.findByCuit(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx as any,
      payload.cuit as string,
      excludeId
    );
    if (dup) throw new PersonaFieldError("Ya existe una persona con ese CUIT.", "cuit", "DUPLICATE_CUIT");
  }
}

/**
 * Translates Postgres unique-constraint violation messages to PersonaFieldError.
 * Acts as a safety net when a race condition bypasses the service-level check.
 */
function translateUniqueError(message: string): PersonaFieldError | Error {
  if (message.includes("documento")) {
    return new PersonaFieldError("Ya existe una persona con ese DNI.", "documento", "DUPLICATE_DOCUMENTO");
  }
  if (message.includes("cuil")) {
    return new PersonaFieldError("Ya existe una persona con ese CUIL.", "cuil", "DUPLICATE_CUIL");
  }
  if (message.includes("cuit")) {
    return new PersonaFieldError("Ya existe una persona con ese CUIT.", "cuit", "DUPLICATE_CUIT");
  }
  return new Error(message);
}

export type RawContacto = {
  id: string;
  canal: string;
  valor: string;
  predeterminado: boolean;
  deleted_at: string | null;
};

export function extractPrincipal(contactos: RawContacto[], canal: string): string | null {
  const active = contactos.filter((c) => !c.deleted_at && c.canal === canal);
  return active.find((c) => c.predeterminado)?.valor ?? active[0]?.valor ?? null;
}

export const personaService = {
  async getAll(ctx: any) {
    const data = await personaRepository.getAll(ctx);

    return data.map((p: any) => {
      const contactos: RawContacto[] = p.persona_contacto ?? [];
      return {
        id: p.id,
        tipo: p.tipo,
        nombre: p.nombre,
        apellido: p.apellido,
        documento: p.documento,
        cuil: p.cuil,
        cuit: p.cuit,
        email_principal: extractPrincipal(contactos, "email"),
        telefono_principal: extractPrincipal(contactos, "telefono"),
      };
    });
  },

  async getById(ctx: any, id: string) {
    return personaRepository.getById(ctx, id);
  },

  async create(ctx: any, payload: any) {
    const { contactos, domicilios, ...rawPersona } = payload;
    const personaPayload = stripPayloadByTipo(rawPersona as PersonaPayload);

    await checkUniqueness(ctx, personaPayload);

    let persona: any;
    try {
      persona = await personaRepository.create(ctx, personaPayload);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("unique constraint")) {
        throw translateUniqueError(err.message);
      }
      throw err;
    }

    // Create initial contactos if provided (create-mode local state)
    if (Array.isArray(contactos) && contactos.length > 0) {
      for (const c of contactos) {
        const normalizedValor = normalizeContactoValor(c.canal, c.valor, c.pais_codigo ?? "AR");
        await personaContactoRepository.create(ctx, persona.id, {
          canal: c.canal,
          categoria: c.categoria,
          valor: normalizedValor,
          descripcion: c.descripcion ?? null,
          predeterminado: c.predeterminado,
          verificado: c.verificado,
          pais_codigo: c.pais_codigo ?? "AR",
        });
      }
    }

    // Create initial domicilios if provided (create-mode local state)
    if (Array.isArray(domicilios) && domicilios.length > 0) {
      for (const d of domicilios) {
        await personaDomicilioRepository.create(ctx, persona.id, {
          categoria: d.categoria,
          calle: d.calle,
          numero: d.numero ?? null,
          piso: d.piso ?? null,
          departamento: d.departamento ?? null,
          barrio: d.barrio ?? null,
          localidad_id: d.localidad_id ?? null,
          codigo_postal: d.codigo_postal ?? null,
          descripcion: d.descripcion ?? null,
          predeterminado: d.predeterminado,
          activo: d.activo,
        });
      }
    }

    return persona;
  },

  async update(ctx: any, id: string, payload: any) {
    const stripped = stripPayloadByTipo(payload as PersonaPayload);
    await checkUniqueness(ctx, stripped, id);

    try {
      return personaRepository.update(ctx, id, stripped);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("unique constraint")) {
        throw translateUniqueError(err.message);
      }
      throw err;
    }
  },

  async delete(ctx: any, id: string) {
    return personaRepository.delete(ctx, id);
  },
};
