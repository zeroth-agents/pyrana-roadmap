import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRateLimiter } from "@/lib/oauth/rate-limit";

describe("oauth/rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T00:00:00Z"));
  });

  it("allows up to limit in window", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(rl.check("k")).toBe(true);
    expect(rl.check("k")).toBe(true);
    expect(rl.check("k")).toBe(true);
    expect(rl.check("k")).toBe(false);
  });

  it("resets after window passes", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(rl.check("k")).toBe(true);
    expect(rl.check("k")).toBe(true);
    expect(rl.check("k")).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rl.check("k")).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("a")).toBe(true);
    expect(rl.check("b")).toBe(true);
    expect(rl.check("a")).toBe(false);
    expect(rl.check("b")).toBe(false);
  });
});
