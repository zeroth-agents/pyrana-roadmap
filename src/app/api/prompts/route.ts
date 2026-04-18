import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { mcpPrompts } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { CreatePromptSchema } from "@/types";
import { broadcastPromptsChanged } from "@/lib/mcp/session-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const rows = await db.select().from(mcpPrompts).orderBy(asc(mcpPrompts.name));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = CreatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  try {
    const [row] = await db
      .insert(mcpPrompts)
      .values({
        name: parsed.data.name,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        template: parsed.data.template,
        arguments: parsed.data.arguments ?? [],
        enabled: parsed.data.enabled ?? true,
        createdBy: user.oid,
        createdByName: user.name,
      })
      .returning();
    broadcastPromptsChanged().catch((err) =>
      console.error("broadcastPromptsChanged failed:", err)
    );
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      return badRequest("A prompt with that name already exists");
    }
    throw err;
  }
}
