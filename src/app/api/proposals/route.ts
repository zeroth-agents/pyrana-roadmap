import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { proposals } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { CreateProposalSchema } from "@/types";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const rows = status
    ? await db
        .select()
        .from(proposals)
        .where(eq(proposals.status, status as any))
        .orderBy(asc(proposals.createdAt))
    : await db
        .select()
        .from(proposals)
        .orderBy(asc(proposals.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = CreateProposalSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [created] = await db
    .insert(proposals)
    .values({
      ...parsed.data,
      proposedBy: user.oid,
      proposedByName: user.name,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
