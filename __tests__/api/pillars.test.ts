import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn(),
}));

describe("GET /api/pillars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue(null);

    const { GET } = await import("@/app/api/pillars/route");
    const request = new Request("http://localhost/api/pillars");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns pillars sorted by sort_order", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const mockPillars = [
      { id: "1", name: "Agent Intelligence", sortOrder: 0 },
      { id: "2", name: "Agent Collaboration", sortOrder: 1 },
    ];

    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockPillars),
      }),
    });

    const { GET } = await import("@/app/api/pillars/route");
    const request = new Request("http://localhost/api/pillars");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPillars);
  });
});
