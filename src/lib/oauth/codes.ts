import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthAuthCodes } from "@/db/schema";
import { generateToken, hashToken } from "./crypto";

const CODE_TTL_MS = 60_000;

export async function createAuthCode(input: {
  clientId: string;
  userOid: string;
  userName: string;
  redirectUri: string;
  scopes: string[];
  resource: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
}): Promise<string> {
  const code = generateToken();
  await db.insert(oauthAuthCodes).values({
    codeHash: hashToken(code),
    clientId: input.clientId,
    userOid: input.userOid,
    userName: input.userName,
    redirectUri: input.redirectUri,
    scopes: input.scopes,
    resource: input.resource,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: input.codeChallengeMethod,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

export type AuthCodeRow = typeof oauthAuthCodes.$inferSelect;

export async function consumeAuthCode(code: string): Promise<AuthCodeRow | null> {
  const hash = hashToken(code);
  return await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(oauthAuthCodes)
      .where(eq(oauthAuthCodes.codeHash, hash));
    const row = rows[0];
    if (!row) return null;
    if (row.consumedAt) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;
    await tx
      .update(oauthAuthCodes)
      .set({ consumedAt: new Date() })
      .where(eq(oauthAuthCodes.codeHash, hash));
    return row;
  });
}
