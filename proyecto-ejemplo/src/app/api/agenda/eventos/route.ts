import { getServerContext } from "@/lib/server/context/getServerContext";
import { agendaService } from "@/lib/server/services/agenda.service";
import {
  agendaEventoCreateSchema,
  agendaEventoListByEntidadQuerySchema,
  agendaEventoListTenantQuerySchema,
} from "@/lib/validation/schemas/agenda.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const entidadTipo = searchParams.get("entidad_tipo");
    const entidadId = searchParams.get("entidad_id");
    const hasTenantDateRange =
      searchParams.has("desde") || searchParams.has("hasta");

    // Panel embebido: solo entidad padre, sin rango de fechas tenant.
    if (entidadTipo && entidadId && !hasTenantDateRange) {
      const parsed = agendaEventoListByEntidadQuerySchema.safeParse({
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
      });

      if (!parsed.success) {
        return Response.json(
          { error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" },
          { status: 422 },
        );
      }

      const data = await agendaService.listByEntidad(
        ctx,
        parsed.data.entidad_tipo,
        parsed.data.entidad_id,
      );
      return Response.json(data);
    }

    const parsed = agendaEventoListTenantQuerySchema.safeParse({
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
      tipo_id: searchParams.get("tipo_id") ?? undefined,
      entidad_tipo: searchParams.get("entidad_tipo") ?? undefined,
      entidad_id: searchParams.get("entidad_id") ?? undefined,
      participante_id: searchParams.get("participante_id") ?? undefined,
      creado_por: searchParams.get("creado_por") ?? undefined,
      estado: searchParams.get("estado") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" },
        { status: 422 },
      );
    }

    const data = await agendaService.listForTenant(ctx, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();
    const parsed = agendaEventoCreateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }

    const data = await agendaService.create(ctx, parsed.data);
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
