import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { insert: vi.fn(), select: vi.fn() },
}));

describe("POST /api/oauth/register", () => {
  beforeEach(() => vi.clearAllMocks());

  async function post(body: unknown, headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/oauth/register/route");
    return POST(
      new Request("http://localhost/api/oauth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1", ...headers },
        body: JSON.stringify(body),
      })
    );
  }

  it("creates a public DCR client and returns client_id with no secret", async () => {
    const { db } = await import("@/db");
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            clientId: "c_abc",
            clientType: "public",
            name: "Claude Desktop",
            redirectUris: ["http://localhost:33418/cb"],
            scopes: ["read", "write"],
            registrationType: "dcr",
          },
        ]),
      }),
    });

    const res = await post({
      client_name: "Claude Desktop",
      redirect_uris: ["http://localhost:33418/cb"],
      scope: "read write",
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.client_id).toBe("c_abc");
    expect(data).not.toHaveProperty("client_secret");
    expect(data.token_endpoint_auth_method).toBe("none");
  });

  it("rejects missing redirect_uris", async () => {
    const res = await post({ client_name: "X", redirect_uris: [] });
    expect(res.status).toBe(400);
  });

  it("rejects unknown scope", async () => {
    const res = await post({
      client_name: "X",
      redirect_uris: ["http://a.test/cb"],
      scope: "admin",
    });
    expect(res.status).toBe(400);
  });

  it("rate limits after N requests from same IP", async () => {
    const { db } = await import("@/db");
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { clientId: "c_x", clientType: "public", name: "X", redirectUris: ["http://a.test/cb"], scopes: ["read"], registrationType: "dcr" },
        ]),
      }),
    });

    // Import fresh to reset module-level limiter — use a unique IP
    vi.resetModules();
    for (let i = 0; i < 10; i++) {
      const res = await post(
        { client_name: "X", redirect_uris: ["http://a.test/cb"], scope: "read" },
        { "x-forwarded-for": "9.9.9.9" }
      );
      expect(res.status).toBe(201);
    }
    const res = await post(
      { client_name: "X", redirect_uris: ["http://a.test/cb"], scope: "read" },
      { "x-forwarded-for": "9.9.9.9" }
    );
    expect(res.status).toBe(429);
  });
});
