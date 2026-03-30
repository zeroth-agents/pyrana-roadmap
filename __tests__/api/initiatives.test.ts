import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
}));

describe("GET /api/initiatives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("returns initiatives filtered by pillarId", async () => {
    const { db } = await import("@/db");
    const mockInitiatives = [
      { id: "1", title: "Episodic CXUs", lane: "now" },
    ];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockInitiatives),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/initiatives/route");
    const request = new Request(
      "http://localhost/api/initiatives?pillarId=abc"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});

describe("POST /api/initiatives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("creates an initiative with valid data", async () => {
    const { db } = await import("@/db");
    const created = {
      id: "new-1",
      title: "New Initiative",
      lane: "backlog",
    };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    });

    const { POST } = await import("@/app/api/initiatives/route");
    const request = new Request("http://localhost/api/initiatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pillarId: "550e8400-e29b-41d4-a716-446655440000",
        title: "New Initiative",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("returns 400 for invalid data", async () => {
    const { POST } = await import("@/app/api/initiatives/route");
    const request = new Request("http://localhost/api/initiatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
