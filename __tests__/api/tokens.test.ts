import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn() },
}));

// Token API requires session auth (not API token), so mock auth directly
vi.mock("../../auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "oid-123", name: "Sam" },
  }),
}));

describe("POST /api/tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a token and returns it unhashed", async () => {
    const { db } = await import("@/db");
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: "tok-1", userOid: "oid-123", userName: "Sam", createdAt: new Date() },
        ]),
      }),
    });

    const { POST } = await import("@/app/api/tokens/route");
    const request = new Request("http://localhost/api/tokens", {
      method: "POST",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe("string");
    expect(data.token.length).toBeGreaterThan(0);
  });
});
