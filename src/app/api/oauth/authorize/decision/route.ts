import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { getClientByClientId, matchRedirectUri } from "@/lib/oauth/clients";
import { parseScopes, isScopeSubset } from "@/lib/oauth/scopes";
import { createAuthCode } from "@/lib/oauth/codes";
import { unauthorized, badRequest } from "@/lib/errors";

export const dynamic = "force-dynamic";

function redirectTo(
  base: string,
  params: Record<string, string | null | undefined>
): NextResponse {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) u.searchParams.set(k, v);
  }
  return NextResponse.redirect(u.toString(), 302);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) return unauthorized();

  const text = await request.text();
  const form = new URLSearchParams(text);

  const decision = form.get("decision");
  const clientId = form.get("client_id");
  const redirectUri = form.get("redirect_uri");
  const scope = form.get("scope") ?? "read";
  const state = form.get("state");
  const codeChallenge = form.get("code_challenge");
  const codeChallengeMethod = form.get("code_challenge_method") ?? "S256";
  const resource = form.get("resource");

  if (!clientId || !redirectUri || !codeChallenge) {
    return badRequest("missing required fields");
  }
  const client = await getClientByClientId(clientId);
  if (!client) return badRequest("unknown client_id");
  if (!matchRedirectUri(redirectUri, client.redirectUris)) {
    return badRequest("redirect_uri not registered");
  }

  if (decision === "deny") {
    return redirectTo(redirectUri, { error: "access_denied", state });
  }

  let scopes: string[];
  try {
    scopes = parseScopes(scope);
  } catch {
    return redirectTo(redirectUri, { error: "invalid_scope", state });
  }
  if (!isScopeSubset(scopes, client.scopes)) {
    return redirectTo(redirectUri, { error: "invalid_scope", state });
  }

  const code = await createAuthCode({
    clientId: client.clientId,
    userOid: session.user.id,
    userName: session.user.name,
    redirectUri,
    scopes,
    resource: resource ?? null,
    codeChallenge,
    codeChallengeMethod,
  });

  return redirectTo(redirectUri, { code, state });
}
