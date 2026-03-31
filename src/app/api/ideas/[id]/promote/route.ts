import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { ideas, initiatives, pillars, users, attachments } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";
import { PromoteIdeaSchema } from "@/types";
import { createLinearProject, updateProjectStatus } from "@/lib/linear";
import { ensureFolder, moveFile } from "@/lib/google-drive";

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

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

  // DB TRANSACTION: create initiative, update idea, transfer attachments
  const { initiative, updatedIdea } = await db.transaction(async (tx) => {
    // Create initiative
    const [newInitiative] = await tx
      .insert(initiatives)
      .values({
        pillarId: parsed.data.pillarId,
        title: idea.title,
        lane: parsed.data.lane ?? "backlog",
        why: idea.body,
        linearProjectId: null,
        linearProjectUrl: null,
        createdBy: user.oid,
        createdByName: user.name,
        assigneeId: idea.assigneeId ?? null,
      })
      .returning();

    // Update idea status
    const [ideaUpdated] = await tx
      .update(ideas)
      .set({
        status: "promoted" as const,
        promotedInitiativeId: newInitiative.id,
        linearProjectId: null,
        pillarId: parsed.data.pillarId,
        updatedAt: new Date(),
      })
      .where(eq(ideas.id, id))
      .returning();

    // Query attachments for the idea
    const ideaAttachments = await tx
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.targetType, "idea"),
          eq(attachments.targetId, id)
        )
      );

    // Transfer attachments if any exist
    if (ideaAttachments.length > 0) {
      // Ensure project folder in Drive (only if root folder is configured)
      let projectFolderId: string | null = null;
      if (ROOT_FOLDER_ID) {
        try {
          const projectsCategoryId = await ensureFolder(ROOT_FOLDER_ID, "projects");
          projectFolderId = await ensureFolder(projectsCategoryId, newInitiative.id);
        } catch (err) {
          console.error("Failed to create project folder in Drive:", err);
          // Continue without Drive folder — DB rows will still transfer
        }
      }

      for (const attachment of ideaAttachments) {
        let newDriveUrl = attachment.driveUrl;
        let newDriveFolderId = attachment.driveFolderId;

        // Only move uploaded files (driveFolderId is not null) when we have a project folder
        if (attachment.driveFolderId && projectFolderId) {
          try {
            const moved = await moveFile(
              attachment.driveFileId,
              attachment.driveFolderId,
              projectFolderId
            );
            newDriveUrl = moved.webViewLink;
            newDriveFolderId = projectFolderId;
          } catch (err) {
            console.error(
              `Failed to move Drive file ${attachment.driveFileId}:`,
              err
            );
            // Best-effort: keep original URL and folderId
          }
        }

        // Insert new row for the initiative
        await tx.insert(attachments).values({
          targetType: "initiative",
          targetId: newInitiative.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          driveFileId: attachment.driveFileId,
          driveUrl: newDriveUrl,
          driveFolderId: newDriveFolderId,
          uploadedBy: attachment.uploadedBy,
          uploadedByName: attachment.uploadedByName,
        });
      }

      // Delete old idea attachment rows
      await tx
        .delete(attachments)
        .where(
          and(
            eq(attachments.targetType, "idea"),
            eq(attachments.targetId, id)
          )
        );
    }

    return { initiative: newInitiative, updatedIdea: ideaUpdated };
  });

  // Create Linear project OUTSIDE transaction (external API call)
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
    // Continue without Linear — still return the initiative
  }

  // Update initiative with Linear IDs if successful
  if (linearProjectId) {
    await db
      .update(initiatives)
      .set({
        linearProjectId,
        linearProjectUrl,
      })
      .where(eq(initiatives.id, initiative.id));

    // Also update the idea with Linear project ID
    await db
      .update(ideas)
      .set({
        linearProjectId,
        updatedAt: new Date(),
      })
      .where(eq(ideas.id, id));
  }

  return NextResponse.json({
    idea: updatedIdea,
    initiative: { ...initiative, linearProjectId, linearProjectUrl },
    linearProjectUrl,
  });
}
