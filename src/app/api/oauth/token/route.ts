import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getClientByClientId, verifyClientSecret } from "@/lib/oauth/clients";
import { consumeAuthCode } from "@/lib/oauth/codes";
import {
  issueTokenPair,
  lookupRefreshToken,
  revokeTokenFamily,
  ACCESS_TTL_MS,
} from "@/lib/oauth/tokens";
import { verifyPkceS256 } from "@/lib/oauth/crypto";
import { formatScopes } from "@/lib/oauth/scopes";
import { db } from "@/db";
import { oauthTokens } from "@/db/schema";

export const dynamic = "force-dynamic";

function oauthError(error: string, description?: string, status = 400) {
  return NextResponse.json(
    description ? { error, error_description: description } : { error },
    { status }
  );
}

function parseBasicAuth(header: string | null): { id: string; secret: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  return { id: decoded.slice(0, idx), secret: decoded.slice(idx + 1) };
}

async function authenticateClient(req: Request, bodyClientId?: string, bodyClientSecret?: string) {
  const basic = parseBasicAuth(req.headers.get("authorization"));
  const clientId = basic?.id ?? bodyClientId;
  const clientSecret = basic?.secret ?? bodyClientSecret;
  if (!clientId) return null;
  const client = await getClientByClientId(clientId);
  if (!client) return null;
  if (client.clientType === "confidential") {
    if (!clientSecret) return null;
    const ok = await verifyClientSecret(client, clientSecret);
    if (!ok) return null;
  }
  return client;
}

export async function POST(request: Request) {
  const text = await request.text();
  const form = new URLSearchParams(text);
  const grantType = form.get("grant_type");

  if (!grantType) return oauthError("invalid_request", "grant_type required");

  if (grantType === "authorization_code") {
    return handleAuthorizationCode(request, form);
  }
  if (grantType === "refresh_token") {
    return handleRefreshToken(request, form);
  }
  return oauthError("unsupported_grant_type");
}

async function handleAuthorizationCode(request: Request, form: URLSearchParams) {
  const code = form.get("code");
  const redirectUri = form.get("redirect_uri");
  const codeVerifier = form.get("code_verifier");
  const bodyClientId = form.get("client_id") ?? undefined;
  const bodyClientSecret = form.get("client_secret") ?? undefined;

  if (!code || !redirectUri || !codeVerifier) {
    return oauthError("invalid_request", "code, redirect_uri, code_verifier required");
  }
  const client = await authenticateClient(request, bodyClientId, bodyClientSecret);
  if (!client) return oauthError("invalid_client", undefined, 401);

  const row = await consumeAuthCode(code);
  if (!row) return oauthError("invalid_grant", "code invalid or expired");
  if (row.clientId !== client.clientId) return oauthError("invalid_grant", "client mismatch");
  if (row.redirectUri !== redirectUri) return oauthError("invalid_grant", "redirect_uri mismatch");
  if (!verifyPkceS256(codeVerifier, row.codeChallenge)) {
    return oauthError("invalid_grant", "PKCE verification failed");
  }

  const pair = await issueTokenPair({
    clientId: client.clientId,
    userOid: row.userOid,
    userName: row.userName,
    scopes: row.scopes,
    resource: row.resource,
    parentTokenId: null,
  });

  return NextResponse.json({
    access_token: pair.accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    refresh_token: pair.refreshToken,
    scope: formatScopes(row.scopes),
  });
}

async function handleRefreshToken(request: Request, form: URLSearchParams) {
  const refreshToken = form.get("refresh_token");
  const bodyClientId = form.get("client_id") ?? undefined;
  const bodyClientSecret = form.get("client_secret") ?? undefined;
  if (!refreshToken) return oauthError("invalid_request", "refresh_token required");

  const client = await authenticateClient(request, bodyClientId, bodyClientSecret);
  if (!client) return oauthError("invalid_client", undefined, 401);

  const row = await lookupRefreshToken(refreshToken);
  if (!row) return oauthError("invalid_grant", "refresh token unknown");
  if (row.clientId !== client.clientId) return oauthError("invalid_grant", "client mismatch");

  if (row.revokedAt) {
    // Reuse detected — cascade revoke the family
    await revokeTokenFamily(row.id);
    return oauthError("invalid_grant", "refresh token reuse detected");
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return oauthError("invalid_grant", "refresh token expired");
  }

  // Atomic rotation: only proceed if THIS call flipped revokedAt from null.
  // If another concurrent refresh beat us, treat as reuse and cascade-revoke.
  const revoked = await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(oauthTokens.id, row.id), isNull(oauthTokens.revokedAt)))
    .returning();
  if (revoked.length === 0) {
    await revokeTokenFamily(row.id);
    return oauthError("invalid_grant", "refresh token reuse detected");
  }

  const pair = await issueTokenPair({
    clientId: row.clientId,
    userOid: row.userOid,
    userName: row.userName,
    scopes: row.scopes,
    resource: row.resource,
    parentTokenId: row.id,
  });

  return NextResponse.json({
    access_token: pair.accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    refresh_token: pair.refreshToken,
    scope: formatScopes(row.scopes),
  });
}
