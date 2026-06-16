import { getServerContext } from "@/lib/server/context/getServerContext";
import { clienteService } from "@/lib/server/services/cliente.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const { lineCount, importCount } = await clienteService.importFromFile(ctx, file);

    return Response.json({ lineCount, importCount });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
