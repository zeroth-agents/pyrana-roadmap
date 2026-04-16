import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUser } from "@/lib/auth-utils";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../auth", () => ({
  auth: vi.fn(),
}));

describe("getUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "fake-entra-id");
  });

  it("returns null when no session and no bearer token", async () => {
    const { auth } = await import("../../auth");
    (auth as any).mockResolvedValue(null);

    const headers = new Headers();
    const result = await getUser(headers);
    expect(result).toBeNull();
  });

  it("returns user from session when authenticated via cookie", async () => {
    const { auth } = await import("../../auth");
    (auth as any).mockResolvedValue({
      user: { id: "oid-123", name: "Sam", email: "sam@test.com" },
    });

    const headers = new Headers();
    const result = await getUser(headers);
    expect(result).toEqual({
      oid: "oid-123",
      name: "Sam",
      scopes: ["read", "write"],
    });
  });

  it("returns user from API token when bearer token provided", async () => {
    const { auth } = await import("../../auth");
    (auth as any).mockResolvedValue(null);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { userOid: "oid-456", userName: "Dev" },
        ]),
      }),
    });
    (db as any).select = mockSelect;
    (db as any).update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const headers = new Headers({ Authorization: "Bearer test-token-123" });
    const result = await getUser(headers);
    expect(result).toEqual({
      oid: "oid-456",
      name: "Dev",
      scopes: ["read", "write"],
    });
  });

  it("returns user with specific scopes from OAuth access token", async () => {
    const { auth } = await import("../../auth");
    (auth as any).mockResolvedValue(null);

    const mockSelect = vi.fn()
      // First call: OAuth token lookup
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "tok-oauth",
              tokenType: "access",
              userOid: "oid-oauth",
              userName: "OAuth User",
              scopes: ["read"],
              revokedAt: null,
              expiresAt: new Date(Date.now() + 60_000),
            },
          ]),
        }),
      });
    (db as any).select = mockSelect;
    (db as any).update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const headers = new Headers({ Authorization: "Bearer oauth-token" });
    const result = await getUser(headers);
    expect(result).toEqual({
      oid: "oid-oauth",
      name: "OAuth User",
      scopes: ["read"],
    });
  });
});
