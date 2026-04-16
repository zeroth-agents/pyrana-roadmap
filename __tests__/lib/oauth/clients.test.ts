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

  describe("createManualClient", () => {
    it("stores hash+prefix and returns plaintext secret with round-trip integrity", async () => {
      const { db } = await import("@/db");
      const { hashToken } = await import("@/lib/oauth/crypto");

      const valuesSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "u1",
            clientId: "c_manual",
            clientType: "confidential",
            name: "Manual",
            redirectUris: ["http://a.test/cb"],
            scopes: ["read"],
            registrationType: "manual",
            ownerOid: "owner-oid-123",
            createdAt: new Date(),
          },
        ]),
      });
      (db.insert as any).mockReturnValue({ values: valuesSpy });

      const { createManualClient } = await import("@/lib/oauth/clients");
      const result = await createManualClient({
        name: "Manual",
        redirectUris: ["http://a.test/cb"],
        scopes: ["read"],
        ownerOid: "owner-oid-123",
      });

      expect(typeof result.clientSecret).toBe("string");
      expect(result.clientSecret.length).toBeGreaterThan(0);

      const values = valuesSpy.mock.calls[0][0];
      expect(hashToken(result.clientSecret)).toBe(values.clientSecretHash);
      expect(values.clientSecretPrefix).toBe(result.clientSecret.slice(0, 8));
      expect(values.clientType).toBe("confidential");
      expect(values.registrationType).toBe("manual");
      expect(values.ownerOid).toBe("owner-oid-123");
    });
  });

  describe("verifyClientSecret", () => {
    it("returns true for matching confidential client + secret", async () => {
      const { verifyClientSecret } = await import("@/lib/oauth/clients");
      const { hashToken } = await import("@/lib/oauth/crypto");
      const client = {
        clientType: "confidential",
        clientSecretHash: hashToken("right-secret"),
      } as any;
      expect(await verifyClientSecret(client, "right-secret")).toBe(true);
    });

    it("returns false for non-matching secret", async () => {
      const { verifyClientSecret } = await import("@/lib/oauth/clients");
      const { hashToken } = await import("@/lib/oauth/crypto");
      const client = {
        clientType: "confidential",
        clientSecretHash: hashToken("right-secret"),
      } as any;
      expect(await verifyClientSecret(client, "wrong-secret")).toBe(false);
    });

    it("returns false for public client even if hash matches", async () => {
      const { verifyClientSecret } = await import("@/lib/oauth/clients");
      const { hashToken } = await import("@/lib/oauth/crypto");
      const client = {
        clientType: "public",
        clientSecretHash: hashToken("x"),
      } as any;
      expect(await verifyClientSecret(client, "x")).toBe(false);
    });

    it("returns false when clientSecretHash is null", async () => {
      const { verifyClientSecret } = await import("@/lib/oauth/clients");
      const client = {
        clientType: "confidential",
        clientSecretHash: null,
      } as any;
      expect(await verifyClientSecret(client, "anything")).toBe(false);
    });
  });

  describe("deleteClient", () => {
    it("returns true and scopes delete by clientId and ownerOid when a row is deleted", async () => {
      const { db } = await import("@/db");
      const { oauthClients } = await import("@/db/schema");

      const whereSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "x" }]),
      });
      (db.delete as any).mockReturnValue({ where: whereSpy });

      const { deleteClient } = await import("@/lib/oauth/clients");
      const ok = await deleteClient("c_1", "owner-a");

      expect(ok).toBe(true);
      expect((db.delete as any)).toHaveBeenCalledTimes(1);
      expect((db.delete as any)).toHaveBeenCalledWith(oauthClients);
      expect(whereSpy).toHaveBeenCalledTimes(1);
      expect(whereSpy.mock.calls[0][0]).toBeTruthy();
    });

    it("returns false when no matching client/owner pair exists", async () => {
      const { db } = await import("@/db");

      const whereSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });
      (db.delete as any).mockReturnValue({ where: whereSpy });

      const { deleteClient } = await import("@/lib/oauth/clients");
      const ok = await deleteClient("c_missing", "owner-b");

      expect(ok).toBe(false);
      expect(whereSpy).toHaveBeenCalledTimes(1);
      expect(whereSpy.mock.calls[0][0]).toBeTruthy();
    });
  });
});
