import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mcpPrompts } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";
import { UpdatePromptSchema } from "@/types";
import { broadcastPromptsChanged } from "@/lib/mcp/session-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const [row] = await db.select().from(mcpPrompts).where(eq(mcpPrompts.id, id));
  if (!row) return notFound("Prompt not found");
  return NextResponse.json(row);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = UpdatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["title", "description", "template", "arguments", "enabled"] as const) {
    if (parsed.data[key] !== undefined) updates[key] = parsed.data[key];
  }

  const [row] = await db
    .update(mcpPrompts)
    .set(updates)
    .where(eq(mcpPrompts.id, id))
    .returning();
  if (!row) return notFound("Prompt not found");

  broadcastPromptsChanged().catch((err) =>
    console.error("broadcastPromptsChanged failed:", err)
  );
  return NextResponse.json(row);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const [row] = await db
    .delete(mcpPrompts)
    .where(eq(mcpPrompts.id, id))
    .returning({ id: mcpPrompts.id });
  if (!row) return notFound("Prompt not found");

  broadcastPromptsChanged().catch((err) =>
    console.error("broadcastPromptsChanged failed:", err)
  );
  return new NextResponse(null, { status: 204 });
}
