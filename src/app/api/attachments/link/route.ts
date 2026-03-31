import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, ideas, initiatives } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";
import { CreateAttachmentLinkSchema } from "@/types";
import { parseDriveFileId } from "@/lib/attachment-utils";
import { getFileMetadata } from "@/lib/google-drive";

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = CreateAttachmentLinkSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const { targetType, targetId, driveUrl } = parsed.data;

  // Parse Drive file ID from URL
  const driveFileId = parseDriveFileId(driveUrl);
  if (!driveFileId) {
    return badRequest("Could not extract Drive file ID from URL");
  }

  // Get file metadata from Drive
  const metadata = await getFileMetadata(driveFileId);
  if (!metadata) {
    return badRequest("Drive file is inaccessible or does not exist");
  }

  // Validate target entity exists
  if (targetType === "idea") {
    const [idea] = await db
      .select()
      .from(ideas)
      .where(eq(ideas.id, targetId));
    if (!idea) return notFound("Idea not found");
    if (idea.status !== "open") {
      return badRequest("Cannot attach files to a non-open idea");
    }
  } else {
    const [initiative] = await db
      .select()
      .from(initiatives)
      .where(eq(initiatives.id, targetId));
    if (!initiative) return notFound("Initiative not found");
  }

  // Insert attachment row — linked files don't get a driveFolderId
  const [created] = await db
    .insert(attachments)
    .values({
      targetType,
      targetId,
      fileName: metadata.name,
      mimeType: metadata.mimeType,
      driveFileId: metadata.id,
      driveUrl: metadata.webViewLink,
      driveFolderId: null,
      uploadedBy: user.oid,
      uploadedByName: user.name,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
