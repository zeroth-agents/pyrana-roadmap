import { NextResponse } from "next/server";
import { z } from "zod";
import { createDcrClient } from "@/lib/oauth/clients";
import { parseScopes, formatScopes } from "@/lib/oauth/scopes";
import { createRateLimiter } from "@/lib/oauth/rate-limit";
import { badRequest } from "@/lib/errors";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

const registerSchema = z.object({
  client_name: z.string().min(1).max(200),
  redirect_uris: z.array(z.string().url()).min(1),
  scope: z.string().optional(),
});

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!limiter.check(ip)) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("invalid JSON body");
  }

  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) return badRequest("invalid registration request");

  let scopes: string[];
  try {
    scopes = parseScopes(parsed.data.scope ?? "read");
    if (scopes.length === 0) scopes = ["read"];
  } catch (e) {
    return badRequest((e as Error).message);
  }

  const client = await createDcrClient({
    name: parsed.data.client_name,
    redirectUris: parsed.data.redirect_uris,
    scopes,
  });

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: formatScopes(client.scopes),
    },
    { status: 201 }
  );
}
