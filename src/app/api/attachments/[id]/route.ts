import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, notFound } from "@/lib/errors";
import { deleteFile } from "@/lib/google-drive";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;

  // Fetch attachment row
  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, id));

  if (!attachment) return notFound("Attachment not found");

  // If uploaded file (has driveFolderId), attempt Drive deletion
  if (attachment.driveFolderId) {
    try {
      await deleteFile(attachment.driveFileId);
    } catch (err) {
      console.warn(`Failed to delete Drive file ${attachment.driveFileId}:`, err);
    }
  }

  // Delete DB row
  await db.delete(attachments).where(eq(attachments.id, id));

  return new NextResponse(null, { status: 204 });
}
