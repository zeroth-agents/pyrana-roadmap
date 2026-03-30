import { NextResponse } from "next/server";
import { asc, eq, and, SQL } from "drizzle-orm";
import { db } from "@/db";
import { initiatives, users } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { CreateInitiativeSchema } from "@/types";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const pillarId = url.searchParams.get("pillarId");
  const lane = url.searchParams.get("lane");
  const assigneeId = url.searchParams.get("assigneeId");

  const conditions: SQL[] = [];
  if (pillarId) conditions.push(eq(initiatives.pillarId, pillarId));
  if (lane) conditions.push(eq(initiatives.lane, lane as any));
  if (assigneeId) conditions.push(eq(initiatives.assigneeId, assigneeId));

  const rows = await db
    .select({
      id: initiatives.id,
      pillarId: initiatives.pillarId,
      title: initiatives.title,
      lane: initiatives.lane,
      size: initiatives.size,
      why: initiatives.why,
      dependsOn: initiatives.dependsOn,
      linearProjectUrl: initiatives.linearProjectUrl,
      linearProjectId: initiatives.linearProjectId,
      linearId: initiatives.linearId,
      linearStatus: initiatives.linearStatus,
      description: initiatives.description,
      content: initiatives.content,
      milestones: initiatives.milestones,
      linearProjectLead: initiatives.linearProjectLead,
      linearAssignee: initiatives.linearAssignee,
      linearSyncedAt: initiatives.linearSyncedAt,
      assigneeId: initiatives.assigneeId,
      issueCountTotal: initiatives.issueCountTotal,
      issueCountDone: initiatives.issueCountDone,
      sortOrder: initiatives.sortOrder,
      createdBy: initiatives.createdBy,
      createdByName: initiatives.createdByName,
      createdAt: initiatives.createdAt,
      updatedAt: initiatives.updatedAt,
      assigneeName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(initiatives.assigneeId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(initiatives.sortOrder));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = CreateInitiativeSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [created] = await db
    .insert(initiatives)
    .values({
      ...parsed.data,
      createdBy: user.oid,
      createdByName: user.name,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
