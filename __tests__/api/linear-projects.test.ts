import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "u1", name: "Sam" }),
}));

vi.mock("@/lib/linear", () => ({
  searchOpenProjects: vi.fn(),
}));

describe("GET /api/linear/projects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns results from searchOpenProjects", async () => {
    const { searchOpenProjects } = await import("@/lib/linear");
    (searchOpenProjects as any).mockResolvedValue([
      { id: "p1", name: "Context Engine", status: "In Progress", url: "https://linear.app/x/p1" },
    ]);

    const { GET } = await import("@/app/api/linear/projects/route");
    const res = await GET(new Request("http://localhost/api/linear/projects?q=context"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("p1");
    expect(searchOpenProjects).toHaveBeenCalledWith("context");
  });

  it("returns [] when q is empty", async () => {
    const { searchOpenProjects } = await import("@/lib/linear");
    (searchOpenProjects as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/linear/projects/route");
    const res = await GET(new Request("http://localhost/api/linear/projects?q="));
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
