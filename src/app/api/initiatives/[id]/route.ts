import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";
import { UpdateInitiativeSchema } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateInitiativeSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [updated] = await db
    .update(initiatives)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(initiatives.id, id))
    .returning();

  if (!updated) return notFound("Initiative not found");

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const [deleted] = await db
    .delete(initiatives)
    .where(eq(initiatives.id, id))
    .returning();

  if (!deleted) return notFound("Initiative not found");

  return NextResponse.json({ message: "Deleted" });
}
