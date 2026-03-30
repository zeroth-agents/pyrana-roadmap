import { NextResponse } from "next/server";
import { desc, eq, and, sql, SQL } from "drizzle-orm";
import { db } from "@/db";
import { ideas, ideaVotes, comments, users } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { CreateIdeaSchema } from "@/types";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const pillarId = url.searchParams.get("pillarId");
  const assigneeId = url.searchParams.get("assigneeId");
  const sort = url.searchParams.get("sort") ?? "votes";

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(ideas.status, status as any));
  if (pillarId) conditions.push(eq(ideas.pillarId, pillarId));
  if (assigneeId) conditions.push(eq(ideas.assigneeId, assigneeId));

  // Subquery: has current user voted on each idea?
  const userVoteSq = db
    .select({ ideaId: ideaVotes.ideaId, voted: sql<boolean>`true`.as("voted") })
    .from(ideaVotes)
    .where(eq(ideaVotes.userId, user.oid))
    .as("user_votes");

  const voteCountSq = db
    .select({ ideaId: ideaVotes.ideaId, count: sql<number>`count(*)`.as("vote_count") })
    .from(ideaVotes)
    .groupBy(ideaVotes.ideaId)
    .as("vote_counts");

  const commentCountSq = db
    .select({
      targetId: comments.targetId,
      count: sql<number>`count(*)`.as("comment_count"),
    })
    .from(comments)
    .where(eq(comments.targetType, "idea"))
    .groupBy(comments.targetId)
    .as("comment_counts");

  let orderBy;
  switch (sort) {
    case "comments":
      orderBy = desc(sql`coalesce(${commentCountSq.count}, 0)`);
      break;
    case "newest":
      orderBy = desc(ideas.createdAt);
      break;
    case "priority":
      orderBy = sql`${ideas.priorityScore} IS NULL, ${ideas.priorityScore} ASC, coalesce(${voteCountSq.count}, 0) DESC`;
      break;
    case "votes":
    default:
      orderBy = desc(sql`coalesce(${voteCountSq.count}, 0)`);
      break;
  }

  const rows = await db
    .select({
      id: ideas.id,
      pillarId: ideas.pillarId,
      title: ideas.title,
      body: ideas.body,
      authorId: ideas.authorId,
      authorName: ideas.authorName,
      priorityScore: ideas.priorityScore,
      status: ideas.status,
      promotedInitiativeId: ideas.promotedInitiativeId,
      linearProjectId: ideas.linearProjectId,
      assigneeId: ideas.assigneeId,
      assigneeName: users.name,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
      voteCount: sql<number>`coalesce(${voteCountSq.count}, 0)`.as("vote_count"),
      commentCount: sql<number>`coalesce(${commentCountSq.count}, 0)`.as("comment_count"),
      userVoted: sql<boolean>`coalesce(${userVoteSq.voted}, false)`.as("user_voted"),
    })
    .from(ideas)
    .leftJoin(voteCountSq, eq(ideas.id, voteCountSq.ideaId))
    .leftJoin(commentCountSq, eq(ideas.id, commentCountSq.targetId))
    .leftJoin(userVoteSq, eq(ideas.id, userVoteSq.ideaId))
    .leftJoin(users, eq(ideas.assigneeId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(orderBy);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = CreateIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [created] = await db
    .insert(ideas)
    .values({
      ...parsed.data,
      authorId: user.oid,
      authorName: user.name,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
