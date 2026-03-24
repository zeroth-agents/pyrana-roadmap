import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "../../../../auth";
import { db } from "@/db";
import { personalAccessTokens } from "@/db/schema";
import { unauthorized } from "@/lib/errors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const tokens = await db
    .select({
      id: personalAccessTokens.id,
      createdAt: personalAccessTokens.createdAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.userOid, session.user.id));

  return NextResponse.json(tokens);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) return unauthorized();

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const [created] = await db
    .insert(personalAccessTokens)
    .values({
      userOid: session.user.id,
      userName: session.user.name,
      tokenHash,
    })
    .returning();

  // Return the unhashed token ONCE — it is never stored or retrievable again
  return NextResponse.json(
    { id: created.id, token: rawToken, createdAt: created.createdAt },
    { status: 201 }
  );
}
