import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ideas, ideaVotes } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, notFound, badRequest } from "@/lib/errors";
import { VoteSchema } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) return badRequest("value must be 1 or -1");
  const { value } = parsed.data;

  const [idea] = await db.select({ id: ideas.id }).from(ideas).where(eq(ideas.id, id));
  if (!idea) return notFound("Idea not found");

  const [existing] = await db
    .select({ id: ideaVotes.id, value: ideaVotes.value })
    .from(ideaVotes)
    .where(and(eq(ideaVotes.ideaId, id), eq(ideaVotes.userId, user.oid)));

  let userVote: 1 | -1 | 0;
  if (!existing) {
    await db.insert(ideaVotes).values({
      ideaId: id,
      userId: user.oid,
      userName: user.name,
      value,
    });
    userVote = value;
  } else if (existing.value === value) {
    await db
      .delete(ideaVotes)
      .where(and(eq(ideaVotes.ideaId, id), eq(ideaVotes.userId, user.oid)));
    userVote = 0;
  } else {
    await db
      .update(ideaVotes)
      .set({ value })
      .where(and(eq(ideaVotes.ideaId, id), eq(ideaVotes.userId, user.oid)));
    userVote = value;
  }

  const [counts] = await db
    .select({
      up: sql<number>`count(*) filter (where ${ideaVotes.value} = 1)`,
      down: sql<number>`count(*) filter (where ${ideaVotes.value} = -1)`,
    })
    .from(ideaVotes)
    .where(eq(ideaVotes.ideaId, id));

  const upCount = Number(counts?.up ?? 0);
  const downCount = Number(counts?.down ?? 0);

  return NextResponse.json({
    upCount,
    downCount,
    score: upCount - downCount,
    userVote,
  });
}
