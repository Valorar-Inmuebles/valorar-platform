import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesService } from "@/lib/server/services/anses.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = (await req.json().catch(() => ({}))) as { anioMes?: string };
    const anioMes = typeof body.anioMes === "string" ? body.anioMes : "";

    await ansesService.triggerSentenciasSync(ctx, anioMes);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
