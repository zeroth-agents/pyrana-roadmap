import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "../../auth";
import { db } from "@/db";
import { personalAccessTokens } from "@/db/schema";
import { upsertUser } from "./user-utils";

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
  // Dev bypass — skip auth when Entra ID is not configured
  if (!process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
    return { oid: "dev-user", name: "Dev User" };
  }

  // Try bearer token first (fast path — skips slow session resolution)
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const hash = hashToken(token);

    const rows = await db
      .select({
        userOid: personalAccessTokens.userOid,
        userName: personalAccessTokens.userName,
      })
      .from(personalAccessTokens)
      .where(eq(personalAccessTokens.tokenHash, hash));

    if (rows.length > 0) {
      // Update last_used_at (fire-and-forget)
      db.update(personalAccessTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(personalAccessTokens.tokenHash, hash))
        .catch(console.error);

      // Capture PAT user in users table (fire-and-forget)
      upsertUser(rows[0].userOid, rows[0].userName).catch(console.error);

      return { oid: rows[0].userOid, name: rows[0].userName };
    }
  }

  // Fall back to session auth (Entra SSO)
  const session = await auth();
  if (session?.user?.id && session.user.name) {
    // Capture Entra user in users table (fire-and-forget)
    upsertUser(session.user.id, session.user.name, session.user.email ?? undefined).catch(console.error);

    return { oid: session.user.id, name: session.user.name };
  }

  return null;
}
