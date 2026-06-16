import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesService } from "@/lib/server/services/anses.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

type RouteParams = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const body = (await req.json()) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";

    await ansesService.updateAnsesPassword(ctx, id, password);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
