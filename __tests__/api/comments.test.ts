import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
}));

describe("POST /api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("creates a comment", async () => {
    const { db } = await import("@/db");
    const created = { id: "c-1", body: "Looks good", targetType: "initiative" };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    });

    const { POST } = await import("@/app/api/comments/route");
    const request = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "initiative",
        targetId: "550e8400-e29b-41d4-a716-446655440000",
        body: "Looks good",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
