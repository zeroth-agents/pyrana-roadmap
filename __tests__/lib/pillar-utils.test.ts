import { describe, it, expect } from "vitest";
import {
  getPillarAbbr,
  getPillarSlug,
  getPillarColorClass,
  getMonogram,
} from "@/lib/pillar-utils";

describe("getPillarAbbr", () => {
  it("returns the initials of each word, max 2 chars", () => {
    expect(getPillarAbbr("Agent Intelligence")).toBe("AI");
    expect(getPillarAbbr("Agent Collaboration")).toBe("AC");
    expect(getPillarAbbr("Data & Compute")).toBe("DC");
    expect(getPillarAbbr("Builder Experience")).toBe("BX");
    expect(getPillarAbbr("Platform Foundation")).toBe("PF");
  });

  it("handles single-word pillar names", () => {
    expect(getPillarAbbr("Platform")).toBe("PL");
  });

  it("handles empty/undefined gracefully", () => {
    expect(getPillarAbbr("")).toBe("??");
    expect(getPillarAbbr(undefined)).toBe("??");
  });

  it("pads single-character pillar names to two chars", () => {
    expect(getPillarAbbr("X")).toBe("XX");
  });
});

describe("getPillarSlug", () => {
  it("maps known pillar names to slugs", () => {
    expect(getPillarSlug("Agent Intelligence")).toBe("ai");
    expect(getPillarSlug("Agent Collaboration")).toBe("ac");
    expect(getPillarSlug("Data & Compute")).toBe("dc");
    expect(getPillarSlug("Builder Experience")).toBe("bx");
    expect(getPillarSlug("Platform Foundation")).toBe("pf");
  });

  it("falls back to a deterministic slug for unknown pillars", () => {
    expect(getPillarSlug("Something New")).toBe("pf");
  });

  it("handles undefined", () => {
    expect(getPillarSlug(undefined)).toBe("pf");
  });
});

describe("getPillarColorClass", () => {
  it("returns the bg-pillar-<slug> tailwind class", () => {
    expect(getPillarColorClass("Agent Intelligence")).toBe("bg-pillar-ai");
    expect(getPillarColorClass("Data & Compute")).toBe("bg-pillar-dc");
  });
});

describe("getMonogram", () => {
  it("returns two-letter uppercase initials of a name", () => {
    expect(getMonogram("Sam Merkovitz")).toBe("SM");
    expect(getMonogram("Kira O'Brien")).toBe("KO");
    expect(getMonogram("Alex")).toBe("AL");
  });

  it("handles empty/undefined", () => {
    expect(getMonogram("")).toBe("??");
    expect(getMonogram(undefined)).toBe("??");
  });

  it("pads single-character names to two chars", () => {
    expect(getMonogram("A")).toBe("AA");
  });
});
