import { getServerContext } from "@/lib/server/context/getServerContext";
import { usuarioService } from "@/lib/server/services/usuario.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const includeSuper =
      new URL(req.url).searchParams.get("includeSuper") === "true";
    const data = await usuarioService.listTenantsForAssign(ctx, {
      includeSuperTenant: includeSuper,
    });
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
