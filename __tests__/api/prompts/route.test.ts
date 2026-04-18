import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("../../../auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "oid-123", name: "Sam" } }),
}));
vi.mock("@/lib/mcp/session-store", () => ({
  broadcastPromptsChanged: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/prompts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all prompts sorted by name", async () => {
    const { db } = await import("@/db");
    const rows = [
      { id: "1", name: "a", title: "A", enabled: true },
      { id: "2", name: "b", title: "B", enabled: false },
    ];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    });
    const { GET } = await import("@/app/api/prompts/route");
    const res = await GET(new Request("http://localhost/api/prompts"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(rows);
  });
});

describe("POST /api/prompts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a prompt and broadcasts change", async () => {
    const { db } = await import("@/db");
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "p-1",
            name: "digest",
            title: "Digest",
            description: "",
            template: "hi",
            arguments: [],
            enabled: true,
          },
        ]),
      }),
    });
    const { POST } = await import("@/app/api/prompts/route");
    const res = await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "digest",
          title: "Digest",
          template: "hi",
        }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("digest");

    const { broadcastPromptsChanged } = await import("@/lib/mcp/session-store");
    expect(broadcastPromptsChanged).toHaveBeenCalled();
  });

  it("rejects invalid name slug", async () => {
    const { POST } = await import("@/app/api/prompts/route");
    const res = await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bad-Name",
          title: "x",
          template: "y",
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing required fields", async () => {
    const { POST } = await import("@/app/api/prompts/route");
    const res = await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for duplicate name", async () => {
    const { db } = await import("@/db");
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(
          new Error('duplicate key value violates unique constraint "mcp_prompts_name_unique"')
        ),
      }),
    });
    const { POST } = await import("@/app/api/prompts/route");
    const res = await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "existing",
          title: "X",
          template: "Y",
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});
