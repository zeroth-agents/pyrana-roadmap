import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, ideaVotes, users } from "@/db/schema";
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

  const [idea] = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      body: ideas.body,
      authorId: ideas.authorId,
      authorName: ideas.authorName,
      pillarId: ideas.pillarId,
      status: ideas.status,
      priorityScore: ideas.priorityScore,
      promotedInitiativeId: ideas.promotedInitiativeId,
      linearProjectId: ideas.linearProjectId,
      assigneeId: ideas.assigneeId,
      assigneeName: users.name,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
    })
    .from(ideas)
    .leftJoin(users, eq(ideas.assigneeId, users.id))
    .where(eq(ideas.id, id));
  if (!idea) return notFound("Idea not found");

  const votes = await db
    .select({ userId: ideaVotes.userId, userName: ideaVotes.userName, value: ideaVotes.value })
    .from(ideaVotes)
    .where(eq(ideaVotes.ideaId, id));

  const upVoters = votes.filter((v) => v.value === 1);
  const downVoters = votes.filter((v) => v.value === -1);
  const userVoteRow = votes.find((v) => v.userId === user.oid);
  const userVote: 1 | -1 | 0 = (userVoteRow?.value as 1 | -1 | undefined) ?? 0;

  return NextResponse.json({
    ...idea,
    upCount: upVoters.length,
    downCount: downVoters.length,
    score: upVoters.length - downVoters.length,
    voters: upVoters.map(({ userId, userName }) => ({ userId, userName })),
    userVote,
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
