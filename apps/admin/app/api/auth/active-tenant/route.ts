import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { buildActiveTenantCookie } from "@/lib/auth/active-tenant";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import type { AuthUser } from "@/lib/auth/types";

type ActiveTenantBody = {
  tenantId?: string;
};

export async function POST(request: Request) {
  let body: ActiveTenantBody;

  try {
    body = (await request.json()) as ActiveTenantBody;
  } catch {
    return NextResponse.json(
      { message: "Cuerpo de solicitud inválido." },
      { status: 400 },
    );
  }

  const tenantId = body.tenantId?.trim();

  if (!tenantId) {
    return NextResponse.json(
      { message: "tenantId es obligatorio." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  const authHeaders = {
    Accept: "application/json",
    Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}`,
  };

  const meResponse = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: authHeaders,
    cache: "no-store",
  });

  if (!meResponse.ok) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  const user = (await meResponse.json()) as AuthUser;

  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { message: "Solo SUPER_ADMIN puede seleccionar tenant." },
      { status: 403 },
    );
  }

  const tenantCheckResponse = await fetch(`${getApiBaseUrl()}/properties`, {
    headers: {
      ...authHeaders,
      "X-Tenant-Id": tenantId,
    },
    cache: "no-store",
  });

  if (tenantCheckResponse.status === 400) {
    return NextResponse.json({ message: "Tenant no encontrado." }, { status: 400 });
  }

  if (!tenantCheckResponse.ok) {
    return NextResponse.json(
      { message: "No se pudo validar el tenant." },
      { status: tenantCheckResponse.status },
    );
  }

  const response = NextResponse.json({ ok: true, tenantId });
  response.cookies.set(buildActiveTenantCookie(tenantId));
  return response;
}
