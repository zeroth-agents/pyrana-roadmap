import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const txMethods = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(async (cb: (tx: typeof txMethods) => Promise<unknown>) =>
      cb(txMethods)
    ),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "user-oid", name: "Test User" }),
}));

vi.mock("@/lib/linear", () => ({
  createLinearProject: vi.fn().mockResolvedValue({
    id: "linear-proj-1",
    url: "https://linear.app/project/1",
  }),
  updateProjectStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/google-drive", () => ({
  ensureFolder: vi.fn(),
  moveFile: vi.fn(),
}));

// --- Helpers ---

const IDEA_ID = "550e8400-e29b-41d4-a716-446655440001";
const PILLAR_ID = "550e8400-e29b-41d4-a716-446655440002";
const INITIATIVE_ID = "550e8400-e29b-41d4-a716-446655440003";

const fakeIdea = {
  id: IDEA_ID,
  title: "Test Idea",
  body: "Idea body",
  status: "open",
  assigneeId: null,
  pillarId: null,
};

const fakePillar = { id: PILLAR_ID, name: "Pillar" };

const fakeInitiative = {
  id: INITIATIVE_ID,
  title: "Test Idea",
  lane: "backlog",
  pillarId: PILLAR_ID,
};

const fakeUpdatedIdea = {
  ...fakeIdea,
  status: "promoted",
  promotedInitiativeId: INITIATIVE_ID,
  pillarId: PILLAR_ID,
};

function makeRequest(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/ideas/${IDEA_ID}/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const fakeParams = Promise.resolve({ id: IDEA_ID });

/**
 * Helper to set up the common mock chains for db.select (idea + pillar lookups)
 * that happen BEFORE the transaction.
 */
function setupPreTransactionSelects(dbMod: { db: Record<string, any> }) {
  // First call: fetch idea
  // Second call: fetch pillar
  let selectCallCount = 0;
  dbMod.db.select.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // idea lookup
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([fakeIdea]),
        }),
      };
    }
    // pillar lookup
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([fakePillar]),
      }),
    };
  });
}

/**
 * Set up transaction mock chains: insert(initiative), update(idea), select(attachments)
 */
function setupTransactionMocks(
  ideaAttachments: Record<string, unknown>[] = []
) {
  // tx.insert — called for initiative creation, then for each new attachment row
  let insertCallCount = 0;
  mockInsert.mockImplementation(() => {
    insertCallCount++;
    if (insertCallCount === 1) {
      // initiative insert
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([fakeInitiative]),
        }),
      };
    }
    // attachment insert (subsequent calls)
    return {
      values: vi.fn().mockResolvedValue(undefined),
    };
  });

  // tx.update — idea status update
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([fakeUpdatedIdea]),
      }),
    }),
  });

  // tx.select — attachments query
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(ideaAttachments),
    }),
  });

  // tx.delete — delete old attachment rows
  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
}

describe("POST /api/ideas/[id]/promote — attachment transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transfers uploaded attachments (moveFile called, new rows created, old rows deleted)", async () => {
    const { db } = await import("@/db");
    const { ensureFolder, moveFile } = await import("@/lib/google-drive");

    // Set env for Drive operations
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = "root-folder-id";

    const uploadedAttachment = {
      id: "att-1",
      targetType: "idea",
      targetId: IDEA_ID,
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      driveFileId: "drive-file-1",
      driveUrl: "https://drive.google.com/old-url",
      driveFolderId: "old-folder-id",
      uploadedBy: "user-oid",
      uploadedByName: "Test User",
    };

    setupPreTransactionSelects({ db: db as unknown as Record<string, any> });
    setupTransactionMocks([uploadedAttachment]);

    // Mock ensureFolder: first call returns projects category, second returns project folder
    (ensureFolder as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce("projects-folder-id")
      .mockResolvedValueOnce("project-folder-id");

    (moveFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      fileId: "drive-file-1",
      webViewLink: "https://drive.google.com/new-url",
    });

    // Also mock db.update for Linear ID update after transaction
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const { POST } = await import("@/app/api/ideas/[id]/promote/route");
    const response = await POST(makeRequest({ pillarId: PILLAR_ID }), {
      params: fakeParams,
    });

    expect(response.status).toBe(200);

    // Verify ensureFolder was called for the projects category and project folder
    expect(ensureFolder).toHaveBeenCalledTimes(2);
    expect(ensureFolder).toHaveBeenCalledWith("root-folder-id", "projects");
    expect(ensureFolder).toHaveBeenCalledWith("projects-folder-id", `Test-Idea-${INITIATIVE_ID.slice(0, 8)}`);

    // Verify moveFile was called for the uploaded file
    expect(moveFile).toHaveBeenCalledTimes(1);
    expect(moveFile).toHaveBeenCalledWith("drive-file-1", "old-folder-id", "project-folder-id");

    // Verify new attachment row was inserted (second insert call)
    expect(mockInsert).toHaveBeenCalledTimes(2); // initiative + 1 attachment

    // Verify old attachment rows were deleted
    expect(mockDelete).toHaveBeenCalledTimes(1);

    // Clean up
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  });

  it("skips Drive move for linked files (moveFile NOT called)", async () => {
    const { db } = await import("@/db");
    const { ensureFolder, moveFile } = await import("@/lib/google-drive");

    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = "root-folder-id";

    const linkedAttachment = {
      id: "att-2",
      targetType: "idea",
      targetId: IDEA_ID,
      fileName: "shared-doc.pdf",
      mimeType: "application/pdf",
      driveFileId: "linked-file-1",
      driveUrl: "https://drive.google.com/linked-url",
      driveFolderId: null, // Linked file — no folder
      uploadedBy: "user-oid",
      uploadedByName: "Test User",
    };

    setupPreTransactionSelects({ db: db as unknown as Record<string, any> });
    setupTransactionMocks([linkedAttachment]);

    (ensureFolder as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce("projects-folder-id")
      .mockResolvedValueOnce("project-folder-id");

    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const { POST } = await import("@/app/api/ideas/[id]/promote/route");
    const response = await POST(makeRequest({ pillarId: PILLAR_ID }), {
      params: fakeParams,
    });

    expect(response.status).toBe(200);

    // moveFile should NOT have been called for linked files
    expect(moveFile).not.toHaveBeenCalled();

    // But attachment row should still be inserted (transferred in DB)
    expect(mockInsert).toHaveBeenCalledTimes(2); // initiative + 1 attachment

    // Old rows should still be deleted
    expect(mockDelete).toHaveBeenCalledTimes(1);

    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  });

  it("works with no attachments (existing behavior preserved)", async () => {
    const { db } = await import("@/db");
    const { ensureFolder, moveFile } = await import("@/lib/google-drive");

    setupPreTransactionSelects({ db: db as unknown as Record<string, any> });
    setupTransactionMocks([]); // No attachments

    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const { POST } = await import("@/app/api/ideas/[id]/promote/route");
    const response = await POST(makeRequest({ pillarId: PILLAR_ID }), {
      params: fakeParams,
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Initiative should be created
    expect(data.initiative).toBeDefined();
    expect(data.idea).toBeDefined();

    // No Drive operations should have happened
    expect(ensureFolder).not.toHaveBeenCalled();
    expect(moveFile).not.toHaveBeenCalled();

    // No attachment inserts or deletes in the transaction
    // Only 1 insert call (the initiative)
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
