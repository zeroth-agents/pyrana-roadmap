import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
}));

describe("POST /api/proposals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("creates a proposal with valid data", async () => {
    const { db } = await import("@/db");
    const created = {
      id: "p-1",
      title: "Add Snowflake connector",
      status: "pending",
    };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    });

    const { POST } = await import("@/app/api/proposals/route");
    const request = new Request("http://localhost/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pillarId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Add Snowflake connector",
        why: "Clients need Snowflake integration",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});

describe("PATCH /api/proposals/:id (accept)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("creates initiative when accepting a proposal", async () => {
    const { db } = await import("@/db");

    // Mock: update proposal
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: "p-1",
            pillarId: "pillar-1",
            title: "New thing",
            size: "M",
            why: "reason",
            status: "accepted",
          }]),
        }),
      }),
    });

    // Mock: insert initiative
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "i-new" }]),
      }),
    });

    const { PATCH } = await import("@/app/api/proposals/[id]/route");
    const request = new Request("http://localhost/api/proposals/p-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted", lane: "next" }),
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "p-1" }),
    });
    expect(response.status).toBe(200);
  });
});
