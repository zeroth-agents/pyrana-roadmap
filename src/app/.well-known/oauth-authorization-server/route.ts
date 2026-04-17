import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function origin(req: Request): string {
  return process.env.APP_URL ?? new URL(req.url).origin;
}

export async function GET(request: Request) {
  const o = origin(request);
  return NextResponse.json({
    issuer: o,
    authorization_endpoint: `${o}/api/oauth/authorize`,
    token_endpoint: `${o}/api/oauth/token`,
    registration_endpoint: `${o}/api/oauth/register`,
    revocation_endpoint: `${o}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "none"],
    scopes_supported: ["read", "write"],
  });
}
