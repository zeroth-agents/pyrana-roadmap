import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn(),
}));

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all users", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { db } = await import("@/db");
    const mockUsers = [
      { id: "u1", entraOid: "oid-1", name: "Sam", email: "sam@test.com", linearUserId: null },
      { id: "u2", entraOid: "oid-2", name: "Alex", email: "alex@test.com", linearUserId: "lin-1" },
    ];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockUsers),
      }),
    });

    const { GET } = await import("@/app/api/users/route");
    const request = new Request("http://localhost/api/users");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Sam");
  });

  it("returns 401 when not authenticated", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue(null);

    const { GET } = await import("@/app/api/users/route");
    const request = new Request("http://localhost/api/users");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/users/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates linearUserId on a user", async () => {
    const { getUser } = await import("@/lib/auth-utils");
    (getUser as any).mockResolvedValue({ oid: "123", name: "Sam" });

    const { db } = await import("@/db");
    const updated = { id: "u1", entraOid: "oid-1", name: "Sam", linearUserId: "lin-123" };
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const { PATCH } = await import("@/app/api/users/[id]/route");
    const request = new Request("http://localhost/api/users/u1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linearUserId: "lin-123" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "u1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.linearUserId).toBe("lin-123");
  });
});
