import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import type { AttachmentTarget } from "@/types";

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/markdown",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

const DRIVE_ID_REGEX = /\/d\/([a-zA-Z0-9_-]+)/;

export function parseDriveFileId(url: string): string | null {
  if (!url) return null;

  // Try /d/{id}/ pattern (covers file, document, spreadsheets, presentation)
  const match = url.match(DRIVE_ID_REGEX);
  if (match) return match[1];

  // Try ?id= query param pattern
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("id");
    if (id) return id;
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Delete all attachment rows (and uploaded Drive files) for a given target.
 * Called when an idea or initiative is deleted.
 * Drive deletion is best-effort — failures are logged but do not block.
 */
export async function cleanupAttachments(
  targetType: AttachmentTarget,
  targetId: string,
  deleteDriveFile: (fileId: string) => Promise<boolean>
): Promise<void> {
  const rows = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.targetType, targetType),
        eq(attachments.targetId, targetId)
      )
    );

  for (const row of rows) {
    // Only delete from Drive if it was an uploaded file (has driveFolderId)
    if (row.driveFolderId) {
      try {
        await deleteDriveFile(row.driveFileId);
      } catch (err) {
        console.warn(`Failed to delete Drive file ${row.driveFileId}:`, err);
      }
    }
  }

  // Delete all DB rows
  if (rows.length > 0) {
    await db
      .delete(attachments)
      .where(
        and(
          eq(attachments.targetType, targetType),
          eq(attachments.targetId, targetId)
        )
      );
  }
}
