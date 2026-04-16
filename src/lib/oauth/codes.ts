import { and, eq, gt, isNull } from "drizzle-orm";
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
  const updated = await db
    .update(oauthAuthCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthAuthCodes.codeHash, hash),
        isNull(oauthAuthCodes.consumedAt),
        gt(oauthAuthCodes.expiresAt, new Date())
      )
    )
    .returning();
  return updated[0] ?? null;
}
