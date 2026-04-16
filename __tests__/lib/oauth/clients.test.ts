import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

describe("oauth/clients", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("matchRedirectUri", () => {
    it("accepts exact match", async () => {
      const { matchRedirectUri } = await import("@/lib/oauth/clients");
      expect(matchRedirectUri("http://a.test/cb", ["http://a.test/cb"])).toBe(true);
    });
    it("rejects trailing slash mismatch", async () => {
      const { matchRedirectUri } = await import("@/lib/oauth/clients");
      expect(matchRedirectUri("http://a.test/cb/", ["http://a.test/cb"])).toBe(false);
    });
    it("rejects unregistered host", async () => {
      const { matchRedirectUri } = await import("@/lib/oauth/clients");
      expect(matchRedirectUri("http://evil.test/cb", ["http://a.test/cb"])).toBe(false);
    });
    it("rejects empty registered list", async () => {
      const { matchRedirectUri } = await import("@/lib/oauth/clients");
      expect(matchRedirectUri("http://a.test/cb", [])).toBe(false);
    });
  });

  describe("createDcrClient", () => {
    it("inserts a public client with no secret and returns it", async () => {
      const { db } = await import("@/db");
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "u1",
              clientId: "c_123",
              clientType: "public",
              name: "Test",
              redirectUris: ["http://a.test/cb"],
              scopes: ["read", "write"],
              registrationType: "dcr",
              ownerOid: null,
              createdAt: new Date(),
            },
          ]),
        }),
      });
      const { createDcrClient } = await import("@/lib/oauth/clients");
      const c = await createDcrClient({
        name: "Test",
        redirectUris: ["http://a.test/cb"],
        scopes: ["read", "write"],
      });
      expect(c.clientId).toBe("c_123");
      expect(c.clientType).toBe("public");
    });
  });

  describe("getClientByClientId", () => {
    it("returns null when not found", async () => {
      const { db } = await import("@/db");
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      const { getClientByClientId } = await import("@/lib/oauth/clients");
      expect(await getClientByClientId("missing")).toBeNull();
    });
  });
});
