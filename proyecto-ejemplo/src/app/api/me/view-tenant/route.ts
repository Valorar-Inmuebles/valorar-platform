import { z } from "zod";

import { isSuperUsuario, SUPER_TENANT_ID } from "@/lib/auth/super-tenant";
import { setViewTenantCookie } from "@/lib/auth/view-tenant";
import { contextRepository } from "@/BBDD/repositories/context.repository";
import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const bodySchema = z.object({
  tenant_id: z.string().uuid().nullable(),
});

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();

    if (!isSuperUsuario(ctx)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { tenant_id: tenantId } = parsed.data;

    if (!tenantId) {
      await setViewTenantCookie(null);
      return Response.json({ view_tenant_id: null, view_tenant_nombre: null });
    }

    if (tenantId === SUPER_TENANT_ID) {
      return Response.json(
        { error: "No se puede seleccionar el tenant del sistema" },
        { status: 400 },
      );
    }

    const tenant = await contextRepository.getTenantNombre(tenantId);
    if (!tenant) {
      return Response.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    await setViewTenantCookie(tenantId, tenant.nombre);

    return Response.json({
      view_tenant_id: tenantId,
      view_tenant_nombre: tenant.nombre,
    });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getServerContext();

    if (!isSuperUsuario(ctx)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    await setViewTenantCookie(null);

    return Response.json({ view_tenant_id: null, view_tenant_nombre: null });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
