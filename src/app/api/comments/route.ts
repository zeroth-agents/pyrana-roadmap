import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { CreateCommentSchema } from "@/types";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const targetType = url.searchParams.get("target_type");
  const targetId = url.searchParams.get("target_id");

  if (!targetType || !targetId) {
    return badRequest("target_type and target_id required");
  }

  const rows = await db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.targetType, targetType as "initiative" | "pillar" | "idea"),
        eq(comments.targetId, targetId)
      )
    )
    .orderBy(asc(comments.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [created] = await db
    .insert(comments)
    .values({
      ...parsed.data,
      author: user.oid,
      authorName: user.name,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
