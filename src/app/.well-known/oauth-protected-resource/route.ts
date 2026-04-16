import { NextResponse } from "next/server";

export const dynamic = "force-static";

function origin(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

export async function GET(request: Request) {
  const o = origin(request);
  return NextResponse.json({
    resource: `${o}/api/mcp`,
    authorization_servers: [o],
    scopes_supported: ["read", "write"],
    bearer_methods_supported: ["header"],
  });
}
