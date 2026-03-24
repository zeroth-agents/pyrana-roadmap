import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "../../../../auth";
import { db } from "@/db";
import { personalAccessTokens } from "@/db/schema";
import { unauthorized } from "@/lib/errors";

async function getSessionUser() {
  if (!process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
    return { id: "dev-user", name: "Dev User" };
  }
  const session = await auth();
  return session?.user ?? null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return unauthorized();

  const tokens = await db
    .select({
      id: personalAccessTokens.id,
      createdAt: personalAccessTokens.createdAt,
      lastUsedAt: personalAccessTokens.lastUsedAt,
    })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.userOid, user.id));

  return NextResponse.json(tokens);
}

export async function POST() {
  const user = await getSessionUser();
  if (!user?.id || !user.name) return unauthorized();

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const [created] = await db
    .insert(personalAccessTokens)
    .values({
      userOid: user.id,
      userName: user.name!,
      tokenHash,
    })
    .returning();

  // Return the unhashed token ONCE — it is never stored or retrievable again
  return NextResponse.json(
    { id: created.id, token: rawToken, createdAt: created.createdAt },
    { status: 201 }
  );
}
