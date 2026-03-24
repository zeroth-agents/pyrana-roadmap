import { NextResponse } from "next/server";
import { asc, eq, and, SQL } from "drizzle-orm";
import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { CreateInitiativeSchema } from "@/types";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const pillarId = url.searchParams.get("pillarId");
  const lane = url.searchParams.get("lane");

  const conditions: SQL[] = [];
  if (pillarId) conditions.push(eq(initiatives.pillarId, pillarId));
  if (lane) conditions.push(eq(initiatives.lane, lane as any));

  const rows = await db
    .select()
    .from(initiatives)
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
