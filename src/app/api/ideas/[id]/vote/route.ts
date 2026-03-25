import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ideas, ideaVotes } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, notFound } from "@/lib/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;

  // Verify idea exists
  const [idea] = await db.select({ id: ideas.id }).from(ideas).where(eq(ideas.id, id));
  if (!idea) return notFound("Idea not found");

  // Check if already voted
  const [existingVote] = await db
    .select()
    .from(ideaVotes)
    .where(and(eq(ideaVotes.ideaId, id), eq(ideaVotes.userId, user.oid)));

  if (existingVote) {
    // Remove vote
    await db
      .delete(ideaVotes)
      .where(and(eq(ideaVotes.ideaId, id), eq(ideaVotes.userId, user.oid)));
  } else {
    // Add vote
    await db.insert(ideaVotes).values({
      ideaId: id,
      userId: user.oid,
      userName: user.name,
    });
  }

  // Return new count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ideaVotes)
    .where(eq(ideaVotes.ideaId, id));

  return NextResponse.json({
    voted: !existingVote,
    voteCount: Number(count),
  });
}
