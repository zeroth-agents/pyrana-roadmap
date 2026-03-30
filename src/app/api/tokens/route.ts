import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { personalAccessTokens } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const tokens = await db
    .select({
      id: personalAccessTokens.id,
      tokenPrefix: personalAccessTokens.tokenPrefix,
      createdAt: personalAccessTokens.createdAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.userOid, user.oid));

  return NextResponse.json(tokens);
}

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenPrefix = rawToken.slice(0, 8);

  const [created] = await db
    .insert(personalAccessTokens)
    .values({
      userOid: user.oid,
      userName: user.name,
      tokenHash,
      tokenPrefix,
    })
    .returning();

  // Return the unhashed token ONCE — it is never stored or retrievable again
  return NextResponse.json(
    { id: created.id, token: rawToken, tokenPrefix, createdAt: created.createdAt },
    { status: 201 }
  );
}
