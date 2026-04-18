import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("../../../auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "oid-123", name: "Sam" } }),
}));
vi.mock("@/lib/mcp/session-store", () => ({
  broadcastPromptsChanged: vi.fn().mockResolvedValue(undefined),
}));

const ID = "11111111-1111-1111-1111-111111111111";

describe("PATCH /api/prompts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates fields and broadcasts", async () => {
    const { db } = await import("@/db");
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: ID, name: "digest", title: "New Title", enabled: true },
          ]),
        }),
      }),
    });
    const { PATCH } = await import("@/app/api/prompts/[id]/route");
    const res = await PATCH(
      new Request(`http://localhost/api/prompts/${ID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "New Title" }),
      }),
      { params: Promise.resolve({ id: ID }) }
    );
    expect(res.status).toBe(200);
    const { broadcastPromptsChanged } = await import("@/lib/mcp/session-store");
    expect(broadcastPromptsChanged).toHaveBeenCalled();
  });

  it("returns 404 when not found", async () => {
    const { db } = await import("@/db");
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const { PATCH } = await import("@/app/api/prompts/[id]/route");
    const res = await PATCH(
      new Request(`http://localhost/api/prompts/${ID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "X" }),
      }),
      { params: Promise.resolve({ id: ID }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/prompts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes and broadcasts", async () => {
    const { db } = await import("@/db");
    (db.delete as any).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: ID }]),
      }),
    });
    const { DELETE } = await import("@/app/api/prompts/[id]/route");
    const res = await DELETE(
      new Request(`http://localhost/api/prompts/${ID}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: ID }) }
    );
    expect(res.status).toBe(204);
    const { broadcastPromptsChanged } = await import("@/lib/mcp/session-store");
    expect(broadcastPromptsChanged).toHaveBeenCalled();
  });

  it("returns 404 when not found", async () => {
    const { db } = await import("@/db");
    (db.delete as any).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });
    const { DELETE } = await import("@/app/api/prompts/[id]/route");
    const res = await DELETE(
      new Request(`http://localhost/api/prompts/${ID}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: ID }) }
    );
    expect(res.status).toBe(404);
  });
});
