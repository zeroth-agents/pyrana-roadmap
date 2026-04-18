import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "u1", name: "Sam" }),
}));

// Returns a chainable subquery builder mock (does NOT execute — just builds .as() object)
function makeSubquerySqMock() {
  const sq: Record<string, unknown> = { _type: "subquery" };
  const chain: Record<string, unknown> = {};
  chain.where = vi.fn().mockReturnValue(chain);
  chain.groupBy = vi.fn().mockReturnValue(chain);
  chain.as = vi.fn().mockReturnValue(sq);
  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

describe("GET /api/ideas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns envelope shape with items and total", async () => {
    const { db } = await import("@/db");

    (db.select as any)
      // call 1: userVoteSq builder (.from().where().as())
      .mockReturnValueOnce(makeSubquerySqMock())
      // call 2: voteAggSq builder (.from().groupBy().as())
      .mockReturnValueOnce(makeSubquerySqMock())
      // call 3: commentCountSq builder (.from().where().groupBy().as())
      .mockReturnValueOnce(makeSubquerySqMock())
      // call 4: main items query
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        offset: vi.fn().mockResolvedValue([{ id: "i1", title: "a", score: 3 }]),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })
      // call 5: total count query
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          }),
        }),
      });

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(new Request("http://localhost/api/ideas"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(body).not.toHaveProperty("buriedCount");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.total).toBe(10);
  });

  it("accepts q, limit, offset params without error", async () => {
    const { db } = await import("@/db");

    (db.select as any)
      // calls 1-3: subquery builders
      .mockReturnValueOnce(makeSubquerySqMock())
      .mockReturnValueOnce(makeSubquerySqMock())
      .mockReturnValueOnce(makeSubquerySqMock())
      // call 4: main items query
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        offset: vi.fn().mockResolvedValue([]),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })
      // call 5: total count
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(
      new Request("http://localhost/api/ideas?q=pipeline&limit=10&offset=20")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});
