import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { GeoProvince } from "@repo/shared-types";

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

export async function GET() {
  try {
    const provinces = await apiFetch<GeoProvince[]>("/geo/provinces", {
      cache: "no-store",
    });
    return NextResponse.json(provinces);
  } catch (error) {
    return geoErrorResponse(error);
  }
}
