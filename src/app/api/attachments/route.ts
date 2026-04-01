import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, ideas, initiatives } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";
import { AttachmentTarget, ListAttachmentsSchema } from "@/types";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "@/lib/attachment-utils";
import { ensureFolder, uploadFile } from "@/lib/google-drive";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const parsed = ListAttachmentsSchema.safeParse({
    target_type: url.searchParams.get("target_type"),
    target_id: url.searchParams.get("target_id"),
  });

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const { target_type, target_id } = parsed.data;

  const rows = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.targetType, target_type),
        eq(attachments.targetId, target_id)
      )
    )
    .orderBy(asc(attachments.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const formData = await request.formData();
  const targetTypeRaw = formData.get("targetType") as string | null;
  const targetId = formData.get("targetId") as string | null;
  const file = formData.get("file") as File | null;

  // Validate targetType
  const targetTypeParsed = AttachmentTarget.safeParse(targetTypeRaw);
  if (!targetTypeParsed.success) {
    return badRequest("Invalid or missing targetType");
  }
  const targetType = targetTypeParsed.data;

  // Validate targetId
  if (!targetId) {
    return badRequest("targetId is required");
  }

  // Validate file — use duck typing for cross-environment compatibility
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return badRequest("file is required");
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return badRequest(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return badRequest(`File type not allowed: ${file.type}`);
  }

  // Validate target entity exists
  let entityTitle: string;
  if (targetType === "idea") {
    const [idea] = await db
      .select({ id: ideas.id, title: ideas.title, status: ideas.status })
      .from(ideas)
      .where(eq(ideas.id, targetId));
    if (!idea) return notFound("Idea not found");
    if (idea.status !== "open") {
      return badRequest("Cannot attach files to a promoted/archived idea");
    }
    entityTitle = idea.title;
  } else {
    const [initiative] = await db
      .select({ id: initiatives.id, title: initiatives.title })
      .from(initiatives)
      .where(eq(initiatives.id, targetId));
    if (!initiative) return notFound("Initiative not found");
    entityTitle = initiative.title;
  }

  // Create Drive folder hierarchy: root → category folder → entity subfolder
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
  const categoryFolderName = targetType === "idea" ? "ideas" : "projects";
  const categoryFolderId = await ensureFolder(rootFolderId, categoryFolderName);
  const shortId = targetId.slice(0, 8);
  const safeName = entityTitle.slice(0, 60).replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  const folderName = `${safeName}-${shortId}`;
  const entityFolderId = await ensureFolder(categoryFolderId, folderName);

  // Upload file to Drive
  let driveResult: { fileId: string; webViewLink: string };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    driveResult = await uploadFile(entityFolderId, buffer, file.name, file.type);
  } catch (err) {
    console.error("Failed to upload to Drive:", err);
    return NextResponse.json(
      { error: "Failed to upload file to Google Drive" },
      { status: 502 }
    );
  }
  const { fileId, webViewLink } = driveResult;

  // Insert attachment row
  const [created] = await db
    .insert(attachments)
    .values({
      targetType,
      targetId,
      fileName: file.name,
      mimeType: file.type,
      driveFileId: fileId,
      driveUrl: webViewLink,
      driveFolderId: entityFolderId,
      uploadedBy: user.oid,
      uploadedByName: user.name,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
