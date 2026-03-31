import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
}));

vi.mock("@/lib/google-drive", () => ({
  ensureFolder: vi.fn().mockResolvedValue("folder-123"),
  uploadFile: vi.fn().mockResolvedValue({
    fileId: "drive-file-123",
    webViewLink: "https://drive.google.com/file/d/drive-file-123/view",
  }),
  getFileMetadata: vi.fn().mockResolvedValue({
    id: "drive-file-456",
    name: "linked-doc.pdf",
    mimeType: "application/pdf",
    webViewLink: "https://drive.google.com/file/d/drive-file-456/view",
  }),
  deleteFile: vi.fn().mockResolvedValue(true),
}));

// ─── GET /api/attachments ─────────────────────────────────────────────
describe("GET /api/attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue(null);

    const { GET } = await import("@/app/api/attachments/route");
    const request = new Request(
      "http://localhost/api/attachments?target_type=initiative&target_id=550e8400-e29b-41d4-a716-446655440000"
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when target_type is missing", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { GET } = await import("@/app/api/attachments/route");
    const request = new Request(
      "http://localhost/api/attachments?target_id=550e8400-e29b-41d4-a716-446655440000"
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns 200 with valid target params", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { db } = await import("@/db");
    const mockAttachments = [
      {
        id: "att-1",
        fileName: "report.pdf",
        targetType: "initiative",
        targetId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockAttachments),
        }),
      }),
    });

    const { GET } = await import("@/app/api/attachments/route");
    const request = new Request(
      "http://localhost/api/attachments?target_type=initiative&target_id=550e8400-e29b-41d4-a716-446655440000"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockAttachments);
  });
});

// ─── POST /api/attachments (upload) ───────────────────────────────────
describe("POST /api/attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid MIME type", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { POST } = await import("@/app/api/attachments/route");
    const formData = new FormData();
    formData.append("targetType", "initiative");
    formData.append("targetId", "550e8400-e29b-41d4-a716-446655440000");
    formData.append(
      "file",
      new File(["content"], "script.exe", { type: "application/x-msdownload" })
    );

    const request = new Request("http://localhost/api/attachments", {
      method: "POST",
      body: formData,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("File type not allowed");
  });
});

// ─── POST /api/attachments/link ───────────────────────────────────────
describe("POST /api/attachments/link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for unrecognized Drive URL", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { POST } = await import("@/app/api/attachments/link/route");
    const request = new Request("http://localhost/api/attachments/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "initiative",
        targetId: "550e8400-e29b-41d4-a716-446655440000",
        driveUrl: "https://example.com/not-a-drive-url",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Could not extract");
  });

  it("returns 201 for valid Drive URL", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { db } = await import("@/db");
    // Mock target existence check
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "550e8400-e29b-41d4-a716-446655440000", title: "Test" },
        ]),
      }),
    });
    // Mock insert
    const createdRow = {
      id: "att-1",
      targetType: "initiative",
      targetId: "550e8400-e29b-41d4-a716-446655440000",
      fileName: "linked-doc.pdf",
      mimeType: "application/pdf",
      driveFileId: "drive-file-456",
      driveUrl: "https://drive.google.com/file/d/drive-file-456/view",
      driveFolderId: null,
      uploadedBy: "123",
      uploadedByName: "Sam",
    };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdRow]),
      }),
    });

    const { POST } = await import("@/app/api/attachments/link/route");
    const request = new Request("http://localhost/api/attachments/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "initiative",
        targetId: "550e8400-e29b-41d4-a716-446655440000",
        driveUrl: "https://drive.google.com/file/d/drive-file-456/view",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});

// ─── DELETE /api/attachments/[id] ─────────────────────────────────────
describe("DELETE /api/attachments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when attachment not found", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { DELETE } = await import("@/app/api/attachments/[id]/route");
    const request = new Request(
      "http://localhost/api/attachments/non-existent-id",
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "non-existent-id" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 204 and calls deleteFile for uploaded attachment", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { db } = await import("@/db");
    const { deleteFile } = await import("@/lib/google-drive");
    const uploadedAttachment = {
      id: "att-1",
      driveFileId: "drive-file-123",
      driveFolderId: "folder-123",
    };
    // First select: fetch attachment
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([uploadedAttachment]),
      }),
    });
    // Delete
    (db.delete as any).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const { DELETE } = await import("@/app/api/attachments/[id]/route");
    const request = new Request("http://localhost/api/attachments/att-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "att-1" }),
    });
    expect(response.status).toBe(204);
    expect(deleteFile).toHaveBeenCalledWith("drive-file-123");
  });

  it("returns 204 and skips deleteFile for linked attachment", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { db } = await import("@/db");
    const { deleteFile } = await import("@/lib/google-drive");
    const linkedAttachment = {
      id: "att-2",
      driveFileId: "drive-file-456",
      driveFolderId: null,
    };
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([linkedAttachment]),
      }),
    });
    (db.delete as any).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const { DELETE } = await import("@/app/api/attachments/[id]/route");
    const request = new Request("http://localhost/api/attachments/att-2", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "att-2" }),
    });
    expect(response.status).toBe(204);
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
