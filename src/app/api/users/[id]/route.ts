import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";

const UpdateUserSchema = z.object({
  linearUserId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [updated] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return notFound("User not found");

  return NextResponse.json(updated);
}
