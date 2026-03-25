import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { personalAccessTokens } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, notFound } from "@/lib/errors";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const [deleted] = await db
    .delete(personalAccessTokens)
    .where(
      and(
        eq(personalAccessTokens.id, id),
        eq(personalAccessTokens.userOid, user.oid)
      )
    )
    .returning();

  if (!deleted) return notFound("Token not found");

  return NextResponse.json({ message: "Token revoked" });
}
