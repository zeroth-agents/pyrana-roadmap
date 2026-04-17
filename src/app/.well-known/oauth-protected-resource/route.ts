import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function origin(req: Request): string {
  return process.env.APP_URL ?? new URL(req.url).origin;
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
