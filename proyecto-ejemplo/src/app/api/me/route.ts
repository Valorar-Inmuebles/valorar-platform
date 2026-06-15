import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();

    return Response.json({
      id: ctx.user.id,
      nombre: ctx.displayName,
      email: ctx.user.email ?? "",
      has_foto: Boolean(ctx.usuario.foto_url),
      is_super_usuario: isSuperUsuario(ctx),
      roles: ctx.roles,
      view_tenant_id: ctx.view_tenant_id ?? null,
      view_tenant_nombre: ctx.view_tenant_nombre ?? null,
    });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
