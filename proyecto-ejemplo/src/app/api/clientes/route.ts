import { getServerContext } from "@/lib/server/context/getServerContext";
import { clienteService } from "@/lib/server/services/cliente.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const data = await clienteService.searchForSelector(ctx, search);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const result = await clienteService.create(ctx, body);

    return Response.json(result);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}