import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/server/session";

export function proxy(request: NextRequest) {
  const authenticated = Boolean(verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value));
  if (request.nextUrl.pathname === "/login") {
    return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (authenticated) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return response;
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/", "/login", "/intake/:path*", "/journeys/:path*", "/documents/:path*", "/activity/:path*"] };
