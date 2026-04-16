import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(async (fn: any) => fn({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "t1" }]) }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    })),
  },
}));

describe("oauth/tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issueTokenPair inserts one access + one refresh and returns both raw tokens", async () => {
    const { db } = await import("@/db");
    const inserts: any[] = [];
    (db.insert as any).mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => {
        inserts.push(v);
        return { returning: vi.fn().mockResolvedValue([{ id: `t${inserts.length}` }]) };
      }),
    }));

    const { issueTokenPair } = await import("@/lib/oauth/tokens");
    const pair = await issueTokenPair({
      clientId: "c_1",
      userOid: "u",
      userName: "U",
      scopes: ["read", "write"],
      resource: "https://x/api/mcp",
      parentTokenId: null,
    });

    expect(pair.accessToken).toMatch(/^[0-9a-f]{64}$/);
    expect(pair.refreshToken).toMatch(/^[0-9a-f]{64}$/);
    expect(pair.accessToken).not.toBe(pair.refreshToken);
    expect(inserts).toHaveLength(2);
    expect(inserts[0].tokenType).toBe("access");
    expect(inserts[1].tokenType).toBe("refresh");
  });
});
