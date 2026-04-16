import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({ db: { select: vi.fn(), update: vi.fn() } }));
vi.mock("../../auth", () => ({ auth: vi.fn() }));

describe("MCP route auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "fake");
  });

  it("returns 401 with WWW-Authenticate resource_metadata when no bearer", async () => {
    const { auth } = await import("../../auth");
    (auth as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
    const www = res.headers.get("www-authenticate");
    expect(www).toContain("Bearer");
    expect(www).toContain("resource_metadata");
    expect(www).toContain("/.well-known/oauth-protected-resource");
  });
});
