import type { DbContext } from "@/BBDD/base/types";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { formatPersonaDisplayName } from "@/lib/persona-display";
import type { ServerContext } from "@/lib/server/context/types";
import { clienteRepository } from "@/BBDD/repositories/cliente.repository";
import { personaRepository } from "@/BBDD/repositories/persona.repository";
import { personaPrevisionalRepository } from "@/BBDD/repositories/persona-previsional.repository";
import { personaService, extractPrincipal, type RawContacto } from "./persona.service";
import { encrypt, decrypt } from "./anses-crypt";

type PersonaPrevisionalRow = {
  persona_id: string;
  numero_beneficio: number;
  secret: string;
};

export type PersonaPrevisionalDto = PersonaPrevisionalRow;

export type ClienteWithPrevisionalDto = {
  id: string;
  persona_id: string;
  tipo: string | null | undefined;
  nombre: string | null | undefined;
  apellido: string | null | undefined;
  documento: string | null | undefined;
  cuil: string | null | undefined;
  cuit: string | null | undefined;
  previsional: PersonaPrevisionalDto | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const IMPORT_CLIENTES_ALLOWED_EXTENSIONS = [".txt", ".csv"] as const;

function isImportClientesFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return IMPORT_CLIENTES_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function displayClienteNombreFromPersona(persona: {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
} | null): string {
  if (!persona) return "—";
  if (persona.tipo === "juridica") {
    return (persona.nombre ?? "").trim() || "—";
  }
  const full = [persona.nombre, persona.apellido].filter(Boolean).join(" ").trim();
  return full || "—";
}

export const clienteService = {
  async getAll(ctx: ServerContext) {
    if (needsViewTenantSelection(ctx)) {
      return [];
    }

    if (ctx.tenant_id == null) {
      throw new Error("Tenant requerido");
    }

    const data = await clienteRepository.getAll({
      tenant_id: ctx.tenant_id,
      is_superadmin: ctx.is_superadmin,
    });

    return data.map((c: any) => {
      const persona = c.persona;
      const contactos: RawContacto[] = persona?.persona_contacto ?? [];
      return {
        id: c.id,
        tipo: persona?.tipo,
        nombre: persona?.nombre,
        apellido: persona?.apellido,
        documento: persona?.documento,
        cuil: persona?.cuil,
        cuit: persona?.cuit,
        email_principal: extractPrincipal(contactos, "email"),
        telefono_principal: extractPrincipal(contactos, "telefono"),
      };
    });
  },

  async getAllWithPrevisional(ctx: {
    tenant_id: string | null;
    is_superadmin?: boolean;
  }): Promise<ClienteWithPrevisionalDto[]> {
    if (ctx.tenant_id == null) {
      throw new Error("Tenant requerido");
    }

    const data = await clienteRepository.getAllWithPrevisionalByTenant({
      tenant_id: ctx.tenant_id,
      is_superadmin: ctx.is_superadmin,
    });

    return data.map((c) => {
      const persona = unwrapOne(c.persona);
      const previsional = unwrapOne(
        persona?.persona_previsional as PersonaPrevisionalRow | PersonaPrevisionalRow[] | null,
      );

      return {
        id: c.id,
        persona_id: c.persona_id,
        tipo: persona?.tipo,
        nombre: persona?.nombre,
        apellido: persona?.apellido,
        documento: persona?.documento,
        cuil: persona?.cuil,
        cuit: persona?.cuit,
        previsional: previsional
          ? {
              persona_id: previsional.persona_id,
              numero_beneficio: previsional.numero_beneficio,
              secret: previsional.secret,
            }
          : null,
      };
    });
  },

  async getById(ctx: any, id: string) {
    return clienteRepository.getById(ctx, id);
  },

  async searchForSelector(ctx: any, query: string) {
    const q = query.trim();
    if (q.length < 2) {
      return [] as { id: string; label: string }[];
    }

    if (ctx.tenant_id == null) {
      throw new Error("Tenant requerido");
    }

    const data = await clienteRepository.searchForSelector(
      { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin },
      q,
    );

    return data.map((row: { id: string; persona: unknown }) => {
      const raw = row.persona as
        | {
            tipo: string | null;
            nombre: string | null;
            apellido: string | null;
          }
        | Array<{
            tipo: string | null;
            nombre: string | null;
            apellido: string | null;
          }>
        | null;
      const persona = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      return {
        id: row.id,
        label: formatPersonaDisplayName(persona),
      };
    });
  },

  async create(ctx: any, payload: any) {
    // Delega toda la lógica de persona (tipo, uniqueness, contactos, domicilios)
    const persona = await personaService.create(ctx, payload);

    const clienteRow = await clienteRepository.insertCliente(ctx, {
      tenant_id: ctx.tenant_id,
      persona_id: persona.id,
    });

    if (!clienteRow?.id) throw new Error("Error al crear cliente");

    return { success: true, id: clienteRow.id, persona_id: persona.id };
  },

  async update(ctx: any, id: string, payload: any) {
    const cliente = await clienteRepository.getPersonaId(ctx, id);

    if (!cliente?.persona_id) throw new Error("Cliente no encontrado");

    // Delega toda la lógica de persona (tipo, uniqueness, strip)
    await personaService.update(ctx, cliente?.persona_id, payload);

    return { success: true };
  },

  async delete(ctx: any, id: string) {
    await clienteRepository.softDelete(ctx, id);
    return { success: true };
  },

  async importFromFile(
    ctx: { tenant_id: string | null; is_superadmin?: boolean },
    file: File,
  ) {
    if (ctx.tenant_id == null) {
      throw new Error("Tenant requerido");
    }

    if (!isImportClientesFileName(file.name)) {
      throw new Error("Solo se permiten archivos .txt o .csv");
    }

    const content = await file.text();
    const fileLines = content
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    const repoCtx = { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
    const previsionalCtx: DbContext = {};

    let i = 0;
    for (const line of fileLines) {
      const [cuilRaw, claveRaw] = line.split(";");
      const cuil = cuilRaw?.trim();
      const clave = claveRaw?.trim();
      if (!cuil || !clave || cuil.length !== 11) {
        continue;
      }

      const existing = await personaRepository.findByCuil(repoCtx, cuil);
      if (existing) {
        continue;
      }

      const persona = await personaRepository.create(repoCtx, {
        tipo: "humana",
        cuil,
      });

      await clienteRepository.insertCliente(repoCtx, {
        tenant_id: ctx.tenant_id,
        persona_id: persona.id,
      });

      await personaPrevisionalRepository.upsertSecretByPersonaId(
        previsionalCtx,
        persona.id,
        clave,
      );
      i++;
    }

    
    return { lineCount: fileLines.length, importCount: i };
  },
};