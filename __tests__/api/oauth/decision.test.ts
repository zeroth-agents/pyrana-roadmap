import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
}));

vi.mock("../../../auth", () => ({
  auth: vi.fn(),
}));

describe("POST /api/oauth/authorize/decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "fake");
  });

  async function post(form: Record<string, string>) {
    const { POST } = await import("@/app/api/oauth/authorize/decision/route");
    return POST(
      new Request("http://localhost/api/oauth/authorize/decision", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(form).toString(),
      })
    );
  }

  it("returns 401 when no session", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue(null);
    const res = await post({ decision: "allow" });
    expect(res.status).toBe(401);
  });

  it("redirects with access_denied on deny", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue({ user: { id: "u1", name: "U" } });
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { clientId: "c_1", redirectUris: ["http://a.test/cb"], scopes: ["read"] },
        ]),
      }),
    });

    const res = await post({
      decision: "deny",
      client_id: "c_1",
      redirect_uri: "http://a.test/cb",
      scope: "read",
      code_challenge: "x",
      code_challenge_method: "S256",
      state: "s",
    });
    expect(res.status).toBe(302);
    const loc = res.headers.get("location")!;
    expect(loc).toContain("http://a.test/cb");
    expect(loc).toContain("error=access_denied");
    expect(loc).toContain("state=s");
  });

  it("issues a code and redirects on allow", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue({ user: { id: "u1", name: "U" } });
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { clientId: "c_1", redirectUris: ["http://a.test/cb"], scopes: ["read", "write"] },
        ]),
      }),
    });
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    });

    const res = await post({
      decision: "allow",
      client_id: "c_1",
      redirect_uri: "http://a.test/cb",
      scope: "read",
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "S256",
      state: "s",
    });
    expect(res.status).toBe(302);
    const loc = res.headers.get("location")!;
    expect(loc).toContain("http://a.test/cb");
    expect(loc).toMatch(/[?&]code=/);
    expect(loc).toContain("state=s");
  });
});
