import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "../../../../../auth";
import { db } from "@/db";
import { personalAccessTokens } from "@/db/schema";
import { unauthorized, notFound } from "@/lib/errors";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  if (!process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
    userId = "dev-user";
  } else {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    userId = session.user.id;
  }

  const { id } = await params;
  const [deleted] = await db
    .delete(personalAccessTokens)
    .where(
      and(
        eq(personalAccessTokens.id, id),
        eq(personalAccessTokens.userOid, userId)
      )
    )
    .returning();

  if (!deleted) return notFound("Token not found");

  return NextResponse.json({ message: "Token revoked" });
}
