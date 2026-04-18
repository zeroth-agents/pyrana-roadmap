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
  getUser: vi.fn().mockResolvedValue({ oid: "u1", name: "Sam" }),
}));

function makeVoteRequest(id: string, value: 1 | -1) {
  return new Request(`http://localhost/api/ideas/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
}

describe("POST /api/ideas/[id]/vote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts an upvote when user has no existing vote", async () => {
    const { db } = await import("@/db");
    const insert = vi.fn();
    (db.select as any)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: "idea-1" }]) }) }) // idea exists
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }) // no existing vote
      .mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ up: 1, down: 0 }]) }) }); // counts
    (db.insert as any).mockReturnValue({ values: insert.mockResolvedValue(undefined) });

    const { POST } = await import("@/app/api/ideas/[id]/vote/route");
    const res = await POST(makeVoteRequest("idea-1", 1), { params: Promise.resolve({ id: "idea-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ upCount: 1, downCount: 0, score: 1, userVote: 1 });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ value: 1, ideaId: "idea-1", userId: "u1" })
    );
  });

  it("deletes the vote when user re-clicks the same side", async () => {
    const { db } = await import("@/db");
    (db.select as any)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: "idea-1" }]) }) })
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: "v1", value: 1 }]) }) })
      .mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ up: 0, down: 0 }]) }) });
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    (db.delete as any).mockReturnValue({ where: deleteFn });

    const { POST } = await import("@/app/api/ideas/[id]/vote/route");
    const res = await POST(makeVoteRequest("idea-1", 1), { params: Promise.resolve({ id: "idea-1" }) });
    const body = await res.json();
    expect(body).toMatchObject({ upCount: 0, downCount: 0, score: 0, userVote: 0 });
    expect(deleteFn).toHaveBeenCalledWith(expect.anything());
  });

  it("switches the vote when user clicks opposite side", async () => {
    const { db } = await import("@/db");
    (db.select as any)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: "idea-1" }]) }) })
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: "v1", value: 1 }]) }) })
      .mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ up: 0, down: 1 }]) }) });
    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    (db.update as any).mockReturnValue({ set: setFn });

    const { POST } = await import("@/app/api/ideas/[id]/vote/route");
    const res = await POST(makeVoteRequest("idea-1", -1), { params: Promise.resolve({ id: "idea-1" }) });
    const body = await res.json();
    expect(body.userVote).toBe(-1);
    expect(body.score).toBe(-1);
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ value: -1 }));
  });

  it("rejects invalid value", async () => {
    const { POST } = await import("@/app/api/ideas/[id]/vote/route");
    const req = new Request("http://localhost/api/ideas/idea-1/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: 2 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "idea-1" }) });
    expect(res.status).toBe(400);
  });
});
