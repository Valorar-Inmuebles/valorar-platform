import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    if (nextPath !== "/") {
      loginUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
