import { getServerContext } from "@/lib/server/context/getServerContext";
import { tenantService } from "@/lib/server/services/tenant.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await tenantService.getAll(ctx);

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const data = await tenantService.create(ctx, body);

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}