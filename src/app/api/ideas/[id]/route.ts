import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, ideaVotes } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound, forbidden } from "@/lib/errors";
import { UpdateIdeaSchema } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;

  const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
  if (!idea) return notFound("Idea not found");

  // Get vote count and voter list
  const votes = await db
    .select({ userId: ideaVotes.userId, userName: ideaVotes.userName })
    .from(ideaVotes)
    .where(eq(ideaVotes.ideaId, id));

  const userVoted = votes.some((v) => v.userId === user.oid);

  return NextResponse.json({
    ...idea,
    voteCount: votes.length,
    voters: votes,
    userVoted,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  // Fetch current idea to check authorship
  const [existing] = await db.select().from(ideas).where(eq(ideas.id, id));
  if (!existing) return notFound("Idea not found");

  // Field-level auth: only author can edit title, body, pillarId
  const authorOnlyFields = ["title", "body", "pillarId"] as const;
  const hasAuthorFields = authorOnlyFields.some(
    (f) => parsed.data[f] !== undefined
  );

  if (hasAuthorFields && existing.authorId !== user.oid) {
    return forbidden("Only the author can edit title, body, and pillar");
  }

  const [updated] = await db
    .update(ideas)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(ideas.id, id))
    .returning();

  return NextResponse.json(updated);
}
