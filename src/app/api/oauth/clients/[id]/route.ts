import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "../../../../../../auth";
import { db } from "@/db";
import { oauthTokens } from "@/db/schema";
import { deleteClient } from "@/lib/oauth/clients";
import { unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { id } = await ctx.params;

  // If this is the user's manual client, delete it outright
  const owned = await deleteClient(id, session.user.id);
  if (owned) {
    await db
      .update(oauthTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(oauthTokens.clientId, id), isNull(oauthTokens.revokedAt)));
    return NextResponse.json({ deleted: true });
  }

  // Otherwise, this is a "disconnect" — revoke all tokens for (user, client)
  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.clientId, id),
        eq(oauthTokens.userOid, session.user.id),
        isNull(oauthTokens.revokedAt)
      )
    );
  return NextResponse.json({ disconnected: true });
}
