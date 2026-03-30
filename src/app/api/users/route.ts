import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      linearUserId: users.linearUserId,
    })
    .from(users)
    .orderBy(asc(users.name));

  return NextResponse.json(rows);
}
