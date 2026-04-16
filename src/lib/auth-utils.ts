import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "../../auth";
import { db } from "@/db";
import { personalAccessTokens, oauthTokens } from "@/db/schema";
import { upsertUser } from "./user-utils";

export interface AuthUser {
  oid: string;
  name: string;
  scopes: string[];
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function lookupOAuthAccessToken(hash: string): Promise<AuthUser | null> {
  const rows = await db
    .select({
      id: oauthTokens.id,
      tokenType: oauthTokens.tokenType,
      userOid: oauthTokens.userOid,
      userName: oauthTokens.userName,
      scopes: oauthTokens.scopes,
      revokedAt: oauthTokens.revokedAt,
      expiresAt: oauthTokens.expiresAt,
    })
    .from(oauthTokens)
    .where(eq(oauthTokens.tokenHash, hash));
  const row = rows[0];
  if (!row) return null;
  if (row.tokenType !== "access") return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  db.update(oauthTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(oauthTokens.id, row.id))
    .catch(console.error);
  upsertUser(row.userOid, row.userName).catch(console.error);

  return { oid: row.userOid, name: row.userName, scopes: row.scopes };
}

async function lookupPAT(hash: string): Promise<AuthUser | null> {
  const rows = await db
    .select({
      userOid: personalAccessTokens.userOid,
      userName: personalAccessTokens.userName,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.tokenHash, hash));
  const row = rows[0];
  if (!row) return null;

  db.update(personalAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(personalAccessTokens.tokenHash, hash))
    .catch(console.error);
  upsertUser(row.userOid, row.userName).catch(console.error);

  return { oid: row.userOid, name: row.userName, scopes: ["read", "write"] };
}

export async function getUser(headers: Headers): Promise<AuthUser | null> {
  if (!process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
    return { oid: "dev-user", name: "Dev User", scopes: ["read", "write"] };
  }

  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const hash = hashToken(authHeader.slice(7));
    const oauthUser = await lookupOAuthAccessToken(hash);
    if (oauthUser) return oauthUser;
    const patUser = await lookupPAT(hash);
    if (patUser) return patUser;
  }

  const session = await auth();
  if (session?.user?.id && session.user.name) {
    upsertUser(session.user.id, session.user.name, session.user.email ?? undefined).catch(
      console.error
    );
    return {
      oid: session.user.id,
      name: session.user.name,
      scopes: ["read", "write"],
    };
  }

  return null;
}
