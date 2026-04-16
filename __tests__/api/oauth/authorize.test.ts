import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("../../../auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/oauth/authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "fake-entra-id");
  });

  async function get(qs: Record<string, string>) {
    const { GET } = await import("@/app/api/oauth/authorize/route");
    const url = `http://localhost/api/oauth/authorize?${new URLSearchParams(qs)}`;
    return GET(new Request(url));
  }

  it("redirects to /login when no session", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue(null);
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { clientId: "c_1", name: "Test", redirectUris: ["http://a.test/cb"], scopes: ["read", "write"], registrationType: "dcr" },
        ]),
      }),
    });

    const res = await get({
      client_id: "c_1",
      redirect_uri: "http://a.test/cb",
      response_type: "code",
      code_challenge: "x",
      code_challenge_method: "S256",
      scope: "read",
      state: "s",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^\/login\?callbackUrl=/);
  });

  it("returns 400 when client_id is unknown", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue({ user: { id: "u", name: "U" } });
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const res = await get({
      client_id: "missing",
      redirect_uri: "http://a.test/cb",
      response_type: "code",
      code_challenge: "x",
      code_challenge_method: "S256",
      scope: "read",
      state: "s",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when redirect_uri is not registered", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue({ user: { id: "u", name: "U" } });
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { clientId: "c_1", redirectUris: ["http://a.test/cb"], scopes: ["read", "write"] },
        ]),
      }),
    });

    const res = await get({
      client_id: "c_1",
      redirect_uri: "http://evil.test/cb",
      response_type: "code",
      code_challenge: "x",
      code_challenge_method: "S256",
      scope: "read",
      state: "s",
    });
    expect(res.status).toBe(400);
  });

  it("redirects to consent page on valid params", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue({ user: { id: "u", name: "U" } });
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { clientId: "c_1", name: "Test", redirectUris: ["http://a.test/cb"], scopes: ["read", "write"], registrationType: "dcr" },
        ]),
      }),
    });

    const res = await get({
      client_id: "c_1",
      redirect_uri: "http://a.test/cb",
      response_type: "code",
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "S256",
      scope: "read write",
      state: "abc",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/\/oauth\/consent\?/);
  });

  it("redirects to redirect_uri with error when scope exceeds client", async () => {
    const { auth } = await import("../../../auth");
    (auth as any).mockResolvedValue({ user: { id: "u", name: "U" } });
    const { db } = await import("@/db");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { clientId: "c_1", name: "Test", redirectUris: ["http://a.test/cb"], scopes: ["read"], registrationType: "dcr" },
        ]),
      }),
    });

    const res = await get({
      client_id: "c_1",
      redirect_uri: "http://a.test/cb",
      response_type: "code",
      code_challenge: "x",
      code_challenge_method: "S256",
      scope: "read write",
      state: "abc",
    });
    expect(res.status).toBe(302);
    const loc = res.headers.get("location")!;
    expect(loc).toContain("http://a.test/cb");
    expect(loc).toContain("error=invalid_scope");
    expect(loc).toContain("state=abc");
  });
});
