import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { oauthTokens } from "@/db/schema";
import { generateToken, hashToken } from "./crypto";

export const ACCESS_TTL_MS = 60 * 60 * 1000;           // 1 hour
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type OauthTokenRow = typeof oauthTokens.$inferSelect;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenId: string;
  refreshTokenId: string;
}

export async function issueTokenPair(input: {
  clientId: string;
  userOid: string;
  userName: string;
  scopes: string[];
  resource: string | null;
  parentTokenId: string | null;
}): Promise<TokenPair> {
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const now = Date.now();

  const [accessRow] = await db
    .insert(oauthTokens)
    .values({
      tokenHash: hashToken(accessToken),
      tokenType: "access",
      clientId: input.clientId,
      userOid: input.userOid,
      userName: input.userName,
      scopes: input.scopes,
      resource: input.resource,
      parentTokenId: input.parentTokenId,
      expiresAt: new Date(now + ACCESS_TTL_MS),
    })
    .returning();

  const [refreshRow] = await db
    .insert(oauthTokens)
    .values({
      tokenHash: hashToken(refreshToken),
      tokenType: "refresh",
      clientId: input.clientId,
      userOid: input.userOid,
      userName: input.userName,
      scopes: input.scopes,
      resource: input.resource,
      parentTokenId: input.parentTokenId,
      expiresAt: new Date(now + REFRESH_TTL_MS),
    })
    .returning();

  return {
    accessToken,
    refreshToken,
    accessTokenId: accessRow.id,
    refreshTokenId: refreshRow.id,
  };
}

export async function lookupAccessToken(rawToken: string): Promise<OauthTokenRow | null> {
  const rows = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.tokenHash, hashToken(rawToken)));
  const row = rows[0];
  if (!row) return null;
  if (row.tokenType !== "access") return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

export async function touchAccessToken(tokenId: string): Promise<void> {
  await db
    .update(oauthTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(oauthTokens.id, tokenId));
}

export async function lookupRefreshToken(rawToken: string): Promise<OauthTokenRow | null> {
  const rows = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.tokenHash, hashToken(rawToken)));
  const row = rows[0];
  if (!row) return null;
  if (row.tokenType !== "refresh") return null;
  return row;
}

export async function revokeTokenFamily(anyTokenId: string): Promise<void> {
  // Walk up to the root (null parent) then revoke everything that descends from it.
  await db.transaction(async (tx) => {
    // Climb
    let rootId = anyTokenId;
    while (true) {
      const [row] = await tx
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.id, rootId));
      if (!row || !row.parentTokenId) break;
      rootId = row.parentTokenId;
    }
    // Collect descendants via BFS
    const toRevoke = new Set<string>([rootId]);
    const frontier = [rootId];
    while (frontier.length > 0) {
      const children = await tx
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.parentTokenId, frontier[0]));
      frontier.shift();
      for (const c of children) {
        if (!toRevoke.has(c.id)) {
          toRevoke.add(c.id);
          frontier.push(c.id);
        }
      }
    }
    for (const id of toRevoke) {
      await tx
        .update(oauthTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(oauthTokens.id, id), isNull(oauthTokens.revokedAt)));
    }
  });
}

export async function revokeUserClientTokens(
  userOid: string,
  clientId: string
): Promise<void> {
  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.userOid, userOid),
        eq(oauthTokens.clientId, clientId),
        isNull(oauthTokens.revokedAt)
      )
    );
}
