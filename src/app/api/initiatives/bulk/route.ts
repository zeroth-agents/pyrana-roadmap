import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { BulkUpdateSchema } from "@/types";

export async function PATCH(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = BulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  await db
    .update(initiatives)
    .set({ ...parsed.data.update, updatedAt: new Date() })
    .where(inArray(initiatives.id, parsed.data.ids));

  return NextResponse.json({ message: "Updated", count: parsed.data.ids.length });
}
