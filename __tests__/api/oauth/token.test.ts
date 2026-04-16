import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(async (fn: any) =>
      fn({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "x" }]) }),
        }),
      })
    ),
  },
}));

describe("POST /api/oauth/token", () => {
  beforeEach(() => vi.clearAllMocks());

  async function post(body: Record<string, string>, headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/oauth/token/route");
    return POST(
      new Request("http://localhost/api/oauth/token", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          ...headers,
        },
        body: new URLSearchParams(body).toString(),
      })
    );
  }

  it("rejects missing grant_type", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  it("rejects unsupported grant_type", async () => {
    const res = await post({ grant_type: "password" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("unsupported_grant_type");
  });

  it("rejects authorization_code grant without required fields", async () => {
    const res = await post({ grant_type: "authorization_code" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  it("rejects refresh_token grant without refresh_token", async () => {
    const res = await post({ grant_type: "refresh_token" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });
});
