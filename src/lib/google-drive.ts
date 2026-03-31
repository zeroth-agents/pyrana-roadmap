import { drive, AuthPlus } from "@googleapis/drive";
import { Readable } from "stream";

// Module-level singleton — same pattern as src/lib/linear.ts
const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()
    )
  : undefined;

const auth = new AuthPlus({
  credentials,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const driveClient = drive({ version: "v3", auth });

/**
 * Find or create a subfolder by name within a parent folder.
 * Queries by name + parent + not trashed to avoid duplicates.
 */
export async function ensureFolder(
  parentId: string,
  name: string
): Promise<string> {
  const res = await driveClient.files.list({
    q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });

  const existing = res.data.files;
  if (existing && existing.length > 0) {
    if (existing.length > 1) {
      console.warn(
        `Multiple folders named "${name}" found in parent ${parentId}, using first`
      );
    }
    return existing[0]!.id!;
  }

  const created = await driveClient.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return created.data.id!;
}

/**
 * Upload a file buffer to a Drive folder.
 */
export async function uploadFile(
  parentFolderId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string }> {
  const res = await driveClient.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink!,
  };
}

/**
 * Move a file from one parent folder to another.
 */
export async function moveFile(
  fileId: string,
  oldParentId: string,
  newParentId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const res = await driveClient.files.update({
    fileId,
    addParents: newParentId,
    removeParents: oldParentId,
    fields: "id, webViewLink",
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink!,
  };
}

/**
 * Delete a file from Drive. Returns true on success, false on error.
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    await driveClient.files.delete({ fileId });
    return true;
  } catch (err) {
    console.warn(`Failed to delete Drive file ${fileId}:`, err);
    return false;
  }
}

/**
 * Fetch metadata for a Drive file. Returns null if inaccessible.
 */
export async function getFileMetadata(
  fileId: string
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
} | null> {
  try {
    const res = await driveClient.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink",
    });
    return {
      id: res.data.id!,
      name: res.data.name!,
      mimeType: res.data.mimeType!,
      webViewLink: res.data.webViewLink!,
    };
  } catch {
    return null;
  }
}
