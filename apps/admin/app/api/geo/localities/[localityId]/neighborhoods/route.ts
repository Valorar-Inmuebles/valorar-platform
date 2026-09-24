import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { GeoNeighborhood } from "@repo/shared-types";

type RouteContext = {
  params: Promise<{ localityId: string }>;
};

function geoErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(error.body ?? { message: error.message }, {
      status: error.status,
    });
  }

  return NextResponse.json(
    { message: "No se pudo consultar el catálogo geográfico." },
    { status: 502 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { localityId } = await context.params;
  const query = new URL(request.url).search;

  try {
    const neighborhoods = await apiFetch<GeoNeighborhood[]>(
      `/geo/localities/${localityId}/neighborhoods${query}`,
      { cache: "no-store" },
    );
    return NextResponse.json(neighborhoods);
  } catch (error) {
    return geoErrorResponse(error);
  }
}
