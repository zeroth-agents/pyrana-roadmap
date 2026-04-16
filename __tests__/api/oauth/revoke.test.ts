import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), update: vi.fn() },
}));

describe("POST /api/oauth/revoke", () => {
  beforeEach(() => vi.clearAllMocks());

  async function post(form: Record<string, string>, headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/oauth/revoke/route");
    return POST(
      new Request("http://localhost/api/oauth/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
        body: new URLSearchParams(form).toString(),
      })
    );
  }

  it("returns 200 even for unknown token (RFC 7009)", async () => {
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ clientId: "c_1", clientType: "public", redirectUris: [] }]),
      }),
    });
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const res = await post({ token: "nonexistent", client_id: "c_1" });
    expect(res.status).toBe(200);
  });

  it("returns 401 for unknown client", async () => {
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    const res = await post({ token: "t", client_id: "unknown" });
    expect(res.status).toBe(401);
  });
});
