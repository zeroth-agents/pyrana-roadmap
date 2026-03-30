import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}));

describe("upsertUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a new user when entraOid does not exist", async () => {
    const { db } = await import("@/db");

    const newUser = { id: "uuid-1", entraOid: "oid-1", name: "Sam", email: "sam@test.com" };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      }),
    });

    const { upsertUser } = await import("@/lib/user-utils");
    const result = await upsertUser("oid-1", "Sam", "sam@test.com");

    expect(db.insert).toHaveBeenCalled();
    expect(result).toEqual(newUser);
  });

  it("updates name and email on conflict", async () => {
    const { db } = await import("@/db");

    const updatedUser = { id: "uuid-1", entraOid: "oid-1", name: "Sam K", email: "sam@new.com" };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedUser]),
        }),
      }),
    });

    const { upsertUser } = await import("@/lib/user-utils");
    const result = await upsertUser("oid-1", "Sam K", "sam@new.com");

    expect(result.name).toBe("Sam K");
    expect(result.email).toBe("sam@new.com");
  });
});
