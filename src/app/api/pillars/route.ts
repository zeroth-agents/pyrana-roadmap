import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pillars } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const rows = await db
    .select()
    .from(pillars)
    .orderBy(asc(pillars.sortOrder));

  return NextResponse.json(rows);
}
