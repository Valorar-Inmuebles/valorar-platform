import { NextResponse, type NextRequest } from "next/server";

import { getAccessPayloadFromRequest } from "@/lib/auth/request-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/ui-kit") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api");

  if (isPublicRoute) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const payload = await getAccessPayloadFromRequest(request);

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
