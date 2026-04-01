import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the @googleapis/drive module
const mockCreate = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockList = vi.fn();

vi.mock("@googleapis/drive", () => ({
  drive: vi.fn(() => ({
    files: {
      create: mockCreate,
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
      list: mockList,
    },
  })),
  auth: {
    GoogleAuth: class MockGoogleAuth {},
  },
}));

// Must import after mock setup
const {
  ensureFolder,
  uploadFile,
  moveFile,
  deleteFile,
  getFileMetadata,
} = await import("@/lib/google-drive");

describe("ensureFolder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing folder ID when folder exists", async () => {
    mockList.mockResolvedValue({
      data: { files: [{ id: "existing-folder-id" }] },
    });

    const result = await ensureFolder("parent-id", "test-folder");
    expect(result).toBe("existing-folder-id");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates folder when none exists", async () => {
    mockList.mockResolvedValue({ data: { files: [] } });
    mockCreate.mockResolvedValue({ data: { id: "new-folder-id" } });

    const result = await ensureFolder("parent-id", "test-folder");
    expect(result).toBe("new-folder-id");
    expect(mockCreate).toHaveBeenCalledWith({
      requestBody: {
        name: "test-folder",
        mimeType: "application/vnd.google-apps.folder",
        parents: ["parent-id"],
      },
      fields: "id",
      supportsAllDrives: true,
    });
  });
});

describe("uploadFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads file and returns fileId and webViewLink", async () => {
    mockCreate.mockResolvedValue({
      data: {
        id: "file-123",
        webViewLink: "https://drive.google.com/file/d/file-123/view",
      },
    });

    const buffer = Buffer.from("test content");
    const result = await uploadFile(
      "folder-id",
      buffer,
      "test.pdf",
      "application/pdf"
    );

    expect(result).toEqual({
      fileId: "file-123",
      webViewLink: "https://drive.google.com/file/d/file-123/view",
    });
  });
});

describe("moveFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves file from old parent to new parent", async () => {
    mockUpdate.mockResolvedValue({
      data: {
        id: "file-123",
        webViewLink: "https://drive.google.com/file/d/file-123/view",
      },
    });

    const result = await moveFile("file-123", "old-parent", "new-parent");
    expect(result).toEqual({
      fileId: "file-123",
      webViewLink: "https://drive.google.com/file/d/file-123/view",
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      fileId: "file-123",
      addParents: "new-parent",
      removeParents: "old-parent",
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });
  });
});

describe("deleteFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true on success", async () => {
    mockDelete.mockResolvedValue({});
    const result = await deleteFile("file-123");
    expect(result).toBe(true);
  });

  it("returns false on error", async () => {
    mockDelete.mockRejectedValue(new Error("Not found"));
    const result = await deleteFile("file-123");
    expect(result).toBe(false);
  });
});

describe("getFileMetadata", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns file metadata", async () => {
    mockGet.mockResolvedValue({
      data: {
        id: "file-123",
        name: "report.pdf",
        mimeType: "application/pdf",
        webViewLink: "https://drive.google.com/file/d/file-123/view",
      },
    });

    const result = await getFileMetadata("file-123");
    expect(result).toEqual({
      id: "file-123",
      name: "report.pdf",
      mimeType: "application/pdf",
      webViewLink: "https://drive.google.com/file/d/file-123/view",
    });
  });

  it("returns null when file not found", async () => {
    mockGet.mockRejectedValue(new Error("File not found"));
    const result = await getFileMetadata("bad-id");
    expect(result).toBeNull();
  });
});
