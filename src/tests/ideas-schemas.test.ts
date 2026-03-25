import { describe, it, expect } from "vitest";
import {
  IdeaStatus,
  CreateIdeaSchema,
  UpdateIdeaSchema,
  PromoteIdeaSchema,
  CommentTarget,
} from "@/types";

describe("IdeaStatus enum", () => {
  it("accepts valid statuses", () => {
    expect(IdeaStatus.parse("open")).toBe("open");
    expect(IdeaStatus.parse("promoted")).toBe("promoted");
    expect(IdeaStatus.parse("archived")).toBe("archived");
  });

  it("rejects invalid status", () => {
    expect(() => IdeaStatus.parse("pending")).toThrow();
  });
});

describe("CommentTarget enum", () => {
  it("accepts idea as target type", () => {
    expect(CommentTarget.parse("idea")).toBe("idea");
  });

  it("still accepts initiative and pillar", () => {
    expect(CommentTarget.parse("initiative")).toBe("initiative");
    expect(CommentTarget.parse("pillar")).toBe("pillar");
  });
});

describe("CreateIdeaSchema", () => {
  it("accepts valid idea with all fields", () => {
    const result = CreateIdeaSchema.safeParse({
      title: "Multi-agent Reasoning Pipeline",
      body: "# Problem\n\nAgents can't collaborate.",
      pillarId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts idea without pillarId (optional)", () => {
    const result = CreateIdeaSchema.safeParse({
      title: "Quick thought",
      body: "Just an idea",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = CreateIdeaSchema.safeParse({
      title: "",
      body: "Some body",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 chars", () => {
    const result = CreateIdeaSchema.safeParse({
      title: "A".repeat(201),
      body: "Some body",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing body", () => {
    const result = CreateIdeaSchema.safeParse({
      title: "A title",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateIdeaSchema", () => {
  it("accepts partial updates", () => {
    const result = UpdateIdeaSchema.safeParse({ title: "New title" });
    expect(result.success).toBe(true);
  });

  it("accepts priorityScore", () => {
    const result = UpdateIdeaSchema.safeParse({ priorityScore: 2 });
    expect(result.success).toBe(true);
  });

  it("accepts status change to archived", () => {
    const result = UpdateIdeaSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = UpdateIdeaSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts null priorityScore to clear it", () => {
    const result = UpdateIdeaSchema.safeParse({ priorityScore: null });
    expect(result.success).toBe(true);
  });
});

describe("PromoteIdeaSchema", () => {
  it("accepts valid promotion", () => {
    const result = PromoteIdeaSchema.safeParse({
      pillarId: "550e8400-e29b-41d4-a716-446655440000",
      lane: "next",
    });
    expect(result.success).toBe(true);
  });

  it("defaults lane to backlog", () => {
    const result = PromoteIdeaSchema.parse({
      pillarId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.lane).toBe("backlog");
  });

  it("rejects missing pillarId", () => {
    const result = PromoteIdeaSchema.safeParse({ lane: "now" });
    expect(result.success).toBe(false);
  });
});
