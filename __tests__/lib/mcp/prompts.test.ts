import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  validatePromptName,
  validateArguments,
  renderPromptPreview,
} from "@/lib/mcp/prompts";

describe("renderTemplate", () => {
  it("substitutes {{var}} placeholders", () => {
    expect(renderTemplate("Hello {{name}}!", { name: "Sam" })).toBe("Hello Sam!");
  });

  it("handles whitespace inside braces", () => {
    expect(renderTemplate("Value: {{  x  }}", { x: "42" })).toBe("Value: 42");
  });

  it("replaces missing vars with empty string", () => {
    expect(renderTemplate("Hi {{missing}}", {})).toBe("Hi ");
  });

  it("leaves non-matching braces untouched", () => {
    // ${foo} is not our syntax, leave alone
    expect(renderTemplate("Literal ${foo}", {})).toBe("Literal ${foo}");
  });

  it("replaces all occurrences of the same var", () => {
    expect(renderTemplate("{{a}}-{{a}}", { a: "x" })).toBe("x-x");
  });
});

describe("validatePromptName", () => {
  it("accepts valid slugs", () => {
    expect(() => validatePromptName("weekly_digest")).not.toThrow();
    expect(() => validatePromptName("a1")).not.toThrow();
  });

  it("rejects uppercase", () => {
    expect(() => validatePromptName("WeeklyDigest")).toThrow();
  });

  it("rejects leading digit", () => {
    expect(() => validatePromptName("1weekly")).toThrow();
  });

  it("rejects too short", () => {
    expect(() => validatePromptName("a")).toThrow();
  });

  it("rejects special chars", () => {
    expect(() => validatePromptName("my-prompt")).toThrow();
    expect(() => validatePromptName("my.prompt")).toThrow();
  });
});

describe("validateArguments", () => {
  it("accepts valid args", () => {
    expect(() =>
      validateArguments([
        { name: "days", required: true },
        { name: "pillar_id", description: "optional filter" },
      ])
    ).not.toThrow();
  });

  it("rejects duplicate names", () => {
    expect(() =>
      validateArguments([{ name: "x" }, { name: "x" }])
    ).toThrow(/Duplicate/);
  });

  it("rejects invalid identifier", () => {
    expect(() => validateArguments([{ name: "1bad" }])).toThrow();
    expect(() => validateArguments([{ name: "bad-name" }])).toThrow();
  });
});

describe("renderPromptPreview", () => {
  it("renders messages array with substituted text", () => {
    const result = renderPromptPreview(
      {
        template: "Summarize the last {{days}} days.",
        arguments: [{ name: "days", required: true }],
      },
      { days: "7" }
    );
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content.type).toBe("text");
    expect(result.messages[0].content.text).toBe("Summarize the last 7 days.");
  });

  it("throws on missing required arg", () => {
    expect(() =>
      renderPromptPreview(
        {
          template: "{{x}}",
          arguments: [{ name: "x", required: true }],
        },
        {}
      )
    ).toThrow(/Missing required/);
  });

  it("allows missing optional args", () => {
    const result = renderPromptPreview(
      {
        template: "Hi {{name}}",
        arguments: [{ name: "name", required: false }],
      },
      {}
    );
    expect(result.messages[0].content.text).toBe("Hi ");
  });
});
