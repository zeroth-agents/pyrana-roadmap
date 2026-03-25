export { auth as proxy } from "./auth";

export const config = {
  matcher: [
    // Protect all pages but skip API routes (they handle their own auth via bearer tokens),
    // NextAuth endpoints, static files, and metadata files
    "/((?!api|_next/static|_next/image|favicon[^/]*|sitemap.xml|robots.txt).*)",
  ],
};
