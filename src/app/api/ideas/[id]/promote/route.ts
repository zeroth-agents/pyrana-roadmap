import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, initiatives, pillars, users } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";
import { PromoteIdeaSchema } from "@/types";
import { createLinearProject, updateProjectStatus } from "@/lib/linear";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = PromoteIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  // Fetch the idea
  const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
  if (!idea) return notFound("Idea not found");
  if (idea.status !== "open") {
    return badRequest("Only open ideas can be promoted");
  }

  // Verify pillar exists
  const [pillar] = await db
    .select()
    .from(pillars)
    .where(eq(pillars.id, parsed.data.pillarId));
  if (!pillar) return badRequest("Pillar not found");

  // Resolve assignee's Linear user ID for project lead
  let linearLeadId: string | undefined;
  if (idea.assigneeId) {
    const [assignee] = await db
      .select({ linearUserId: users.linearUserId })
      .from(users)
      .where(eq(users.id, idea.assigneeId));
    linearLeadId = assignee?.linearUserId ?? undefined;
  }

  // Create Linear project
  let linearProjectId: string | null = null;
  let linearProjectUrl: string | null = null;
  try {
    const linearProject = await createLinearProject(
      idea.title,
      idea.body,
      linearLeadId
    );
    linearProjectId = linearProject.id;
    linearProjectUrl = linearProject.url;

    // Set the Linear project status to match the selected lane
    const selectedLane = parsed.data.lane ?? "backlog";
    if (selectedLane !== "backlog") {
      await updateProjectStatus(linearProject.id, selectedLane);
    }
  } catch (err) {
    console.error("Failed to create Linear project:", err);
    // Continue without Linear — still create initiative locally
  }

  // Create initiative
  const [initiative] = await db
    .insert(initiatives)
    .values({
      pillarId: parsed.data.pillarId,
      title: idea.title,
      lane: parsed.data.lane ?? "backlog",
      why: idea.body,
      linearProjectId,
      linearProjectUrl,
      createdBy: user.oid,
      createdByName: user.name,
      assigneeId: idea.assigneeId ?? null,
    })
    .returning();

  // Update idea status
  const [updatedIdea] = await db
    .update(ideas)
    .set({
      status: "promoted",
      promotedInitiativeId: initiative.id,
      linearProjectId,
      pillarId: parsed.data.pillarId,
      updatedAt: new Date(),
    })
    .where(eq(ideas.id, id))
    .returning();

  return NextResponse.json({
    idea: updatedIdea,
    initiative,
    linearProjectUrl,
  });
}
