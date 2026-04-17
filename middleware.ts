import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Let API routes and well-known discovery docs through — they handle their own auth
  if (pathname.startsWith("/api/")) return;
  if (pathname.startsWith("/.well-known/")) return;
  if (pathname.startsWith("/oauth/")) return;

  // Login page: allow unauthenticated, redirect authenticated users home
  if (pathname === "/login") {
    if (req.auth) return NextResponse.redirect(new URL("/", req.url));
    return;
  }

  // Redirect unauthenticated page requests to login
  if (!req.auth) {
    const signInUrl = new URL("/login", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (static assets)
     * - favicon.ico, icons, manifest
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|manifest\\.json).*)",
  ],
};
