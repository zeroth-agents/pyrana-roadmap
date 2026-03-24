import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "../../auth";
import { db } from "@/db";
import { personalAccessTokens } from "@/db/schema";

export interface AuthUser {
  oid: string;
  name: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getUser(
  headers: Headers
): Promise<AuthUser | null> {
  // Try session auth first
  const session = await auth();
  if (session?.user?.id && session.user.name) {
    return { oid: session.user.id, name: session.user.name };
  }

  // Try bearer token
  const authHeader = headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const hash = hashToken(token);

  const rows = await db
    .select({
      userOid: personalAccessTokens.userOid,
      userName: personalAccessTokens.userName,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.tokenHash, hash));

  if (rows.length === 0) return null;

  // Update last_used_at (fire-and-forget)
  db.update(personalAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(personalAccessTokens.tokenHash, hash))
    .catch(console.error);

  return { oid: rows[0].userOid, name: rows[0].userName };
}
