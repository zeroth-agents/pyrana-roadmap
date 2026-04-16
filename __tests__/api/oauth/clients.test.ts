import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), update: vi.fn() },
}));

vi.mock("../../../auth", () => ({
  auth: vi.fn(),
}));

describe("OAuth clients management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "fake");
  });

  describe("POST /api/oauth/clients", () => {
    it("requires session", async () => {
      const { auth } = await import("../../../auth");
      (auth as any).mockResolvedValue(null);
      const { POST } = await import("@/app/api/oauth/clients/route");
      const res = await POST(
        new Request("http://localhost/api/oauth/clients", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "x", redirect_uris: ["http://a.test/cb"] }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("creates a manual confidential client and returns client_secret once", async () => {
      const { auth } = await import("../../../auth");
      (auth as any).mockResolvedValue({ user: { id: "u1", name: "U" } });
      const { db } = await import("@/db");
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: "r1", clientId: "c_m1", name: "Script", clientType: "confidential", redirectUris: ["http://a.test/cb"], scopes: ["read"], ownerOid: "u1" },
          ]),
        }),
      });
      const { POST } = await import("@/app/api/oauth/clients/route");
      const res = await POST(
        new Request("http://localhost/api/oauth/clients", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Script", redirect_uris: ["http://a.test/cb"], scopes: ["read"] }),
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.client_id).toBe("c_m1");
      expect(data.client_secret).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
