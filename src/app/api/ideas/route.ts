import { NextResponse } from "next/server";
import { desc, eq, and, or, ilike, sql, SQL } from "drizzle-orm";
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
  const assigneeIdParam = assigneeId;
  const q = url.searchParams.get("q")?.trim() ?? "";
  const includeBuried = url.searchParams.get("includeBuried") === "true";
  const sort = url.searchParams.get("sort") ?? "votes";
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "30", 10);
  const limit = Math.max(1, Math.min(100, isNaN(limitRaw) ? 30 : limitRaw));
  const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(ideas.status, status as "open" | "promoted" | "archived"));
  if (pillarId) conditions.push(eq(ideas.pillarId, pillarId));
  if (assigneeIdParam) conditions.push(eq(ideas.assigneeId, assigneeIdParam));
  if (q) {
    const pat = `%${q}%`;
    conditions.push(or(ilike(ideas.title, pat), ilike(ideas.body, pat))!);
  }

  const userVoteSq = db
    .select({
      ideaId: ideaVotes.ideaId,
      value: ideaVotes.value,
    })
    .from(ideaVotes)
    .where(eq(ideaVotes.userId, user.oid))
    .as("user_votes");

  const voteAggSq = db
    .select({
      ideaId: ideaVotes.ideaId,
      up: sql<number>`count(*) filter (where ${ideaVotes.value} = 1)`.as("up"),
      down: sql<number>`count(*) filter (where ${ideaVotes.value} = -1)`.as("down"),
    })
    .from(ideaVotes)
    .groupBy(ideaVotes.ideaId)
    .as("vote_aggs");

  const commentCountSq = db
    .select({
      targetId: comments.targetId,
      count: sql<number>`count(*)`.as("comment_count"),
    })
    .from(comments)
    .where(eq(comments.targetType, "idea"))
    .groupBy(comments.targetId)
    .as("comment_counts");

  const scoreExpr = sql<number>`coalesce(${voteAggSq.up}, 0) - coalesce(${voteAggSq.down}, 0)`;

  // Apply buried filter — but only when status filter is NOT "archived"
  const appliedConditions = [...conditions];
  if (!includeBuried && status !== "archived") {
    appliedConditions.push(sql`coalesce(${voteAggSq.up}, 0) - coalesce(${voteAggSq.down}, 0) >= 0`);
  }

  let orderBy;
  switch (sort) {
    case "comments":
      orderBy = desc(sql`coalesce(${commentCountSq.count}, 0)`);
      break;
    case "newest":
      orderBy = desc(ideas.createdAt);
      break;
    case "priority":
      orderBy = sql`${ideas.priorityScore} IS NULL, ${ideas.priorityScore} ASC, ${scoreExpr} DESC`;
      break;
    case "votes":
    default:
      orderBy = sql`${scoreExpr} DESC, ${ideas.createdAt} DESC`;
      break;
  }

  const items = await db
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
      upCount: sql<number>`coalesce(${voteAggSq.up}, 0)`.as("up_count"),
      downCount: sql<number>`coalesce(${voteAggSq.down}, 0)`.as("down_count"),
      score: sql<number>`coalesce(${voteAggSq.up}, 0) - coalesce(${voteAggSq.down}, 0)`.as("score"),
      commentCount: sql<number>`coalesce(${commentCountSq.count}, 0)`.as("comment_count"),
      userVote: sql<number>`coalesce(${userVoteSq.value}, 0)`.as("user_vote"),
    })
    .from(ideas)
    .leftJoin(voteAggSq, eq(ideas.id, voteAggSq.ideaId))
    .leftJoin(commentCountSq, eq(ideas.id, commentCountSq.targetId))
    .leftJoin(userVoteSq, eq(ideas.id, userVoteSq.ideaId))
    .leftJoin(users, eq(ideas.assigneeId, users.id))
    .where(appliedConditions.length ? and(...appliedConditions) : undefined)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ideas)
    .leftJoin(voteAggSq, eq(ideas.id, voteAggSq.ideaId))
    .where(appliedConditions.length ? and(...appliedConditions) : undefined);

  const buriedConditions = [...conditions];
  buriedConditions.push(sql`coalesce(${voteAggSq.up}, 0) - coalesce(${voteAggSq.down}, 0) < 0`);
  const [buriedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ideas)
    .leftJoin(voteAggSq, eq(ideas.id, voteAggSq.ideaId))
    .where(and(...buriedConditions));

  return NextResponse.json({
    items,
    total: Number(totalRow?.count ?? 0),
    buriedCount: Number(buriedRow?.count ?? 0),
  });
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
