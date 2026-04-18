import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "u-self", name: "Sam" }),
}));

describe("GET /api/ideas/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns upCount/downCount/score/userVote; voters includes only upvoters without value", async () => {
    const { db } = await import("@/db");

    const idea = {
      id: "idea-1",
      title: "X",
      body: "Y",
      authorId: "auth-1",
      authorName: "Author",
      pillarId: null,
      status: "open",
      priorityScore: null,
      promotedInitiativeId: null,
      linearProjectId: null,
      assigneeId: null,
      assigneeName: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const votes = [
      { userId: "u-self", userName: "Sam", value: 1 },
      { userId: "u-2", userName: "Alice", value: 1 },
      { userId: "u-3", userName: "Bob", value: -1 },
    ];

    (db.select as any)
      // First select: idea lookup
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([idea]),
          }),
        }),
      })
      // Second select: votes query
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(votes),
        }),
      });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const res = await GET(new Request("http://localhost/api/ideas/idea-1"), {
      params: Promise.resolve({ id: "idea-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.upCount).toBe(2);
    expect(body.downCount).toBe(1);
    expect(body.score).toBe(1);
    expect(body.userVote).toBe(1);
    // voters is ONLY upvoters, without value field
    expect(body.voters).toHaveLength(2);
    expect(body.voters.every((v: any) => v.value === undefined)).toBe(true);
    expect(body.voters.map((v: any) => v.userId).sort()).toEqual(["u-2", "u-self"]);
  });

  it("userVote is 0 when current user has not voted", async () => {
    const { db } = await import("@/db");
    (db.select as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: "i", title: "x", body: "y" }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { userId: "u-other", userName: "Other", value: 1 },
          ]),
        }),
      });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const res = await GET(new Request("http://localhost/api/ideas/i"), {
      params: Promise.resolve({ id: "i" }),
    });
    const body = await res.json();
    expect(body.userVote).toBe(0);
    expect(body.upCount).toBe(1);
  });

  it("returns 404 when idea does not exist", async () => {
    const { db } = await import("@/db");
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const res = await GET(new Request("http://localhost/api/ideas/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});
