import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/oauth/session";
import { getClientByClientId, matchRedirectUri } from "@/lib/oauth/clients";
import { parseScopes, isScopeSubset } from "@/lib/oauth/scopes";
import { badRequest } from "@/lib/errors";

export const dynamic = "force-dynamic";

function redirectWithError(
  redirectUri: string,
  error: string,
  state: string | null
): NextResponse {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (state) u.searchParams.set("state", state);
  return NextResponse.redirect(u.toString(), 302);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");
  const state = params.get("state");
  const resource = params.get("resource");
  const scopeParam = params.get("scope");

  if (!clientId || !redirectUri) return badRequest("client_id and redirect_uri required");

  const client = await getClientByClientId(clientId);
  if (!client) return badRequest("unknown client_id");

  if (!matchRedirectUri(redirectUri, client.redirectUris)) {
    return badRequest("redirect_uri not registered");
  }

  // From here, all errors are redirected back to redirect_uri
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    const callbackUrl = encodeURIComponent(url.pathname + url.search);
    // Use a raw Response so the Location header is a relative URL — the browser
    // will resolve against the current origin. NextResponse.redirect rejects
    // relative URLs, but relative Location headers are valid per RFC 7231.
    return new Response(null, {
      status: 302,
      headers: { location: `/login?callbackUrl=${callbackUrl}` },
    });
  }

  if (responseType !== "code") {
    return redirectWithError(redirectUri, "unsupported_response_type", state);
  }
  if (codeChallengeMethod !== "S256" || !codeChallenge) {
    return redirectWithError(redirectUri, "invalid_request", state);
  }

  const scopeRaw = scopeParam ?? client.scopes.join(" ");
  let scopes: string[];
  try {
    scopes = parseScopes(scopeRaw);
  } catch {
    return redirectWithError(redirectUri, "invalid_scope", state);
  }
  if (!isScopeSubset(scopes, client.scopes)) {
    return redirectWithError(redirectUri, "invalid_scope", state);
  }

  // Defer actual code issuance to the consent decision endpoint.
  // Build a consent URL with all validated params passed through (server still re-validates on decision).
  const appOrigin = process.env.APP_URL ?? url.origin;
  const consent = new URL("/oauth/consent", appOrigin);
  consent.searchParams.set("client_id", clientId);
  consent.searchParams.set("client_name", client.name);
  consent.searchParams.set("registration_type", client.registrationType);
  consent.searchParams.set("redirect_uri", redirectUri);
  consent.searchParams.set("scope", scopes.join(" "));
  consent.searchParams.set("code_challenge", codeChallenge);
  consent.searchParams.set("code_challenge_method", codeChallengeMethod);
  if (state) consent.searchParams.set("state", state);
  if (resource) consent.searchParams.set("resource", resource);
  return NextResponse.redirect(consent.toString(), 302);
}
