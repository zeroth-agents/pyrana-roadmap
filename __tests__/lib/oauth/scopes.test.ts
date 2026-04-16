import { describe, it, expect } from "vitest";
import {
  parseScopes,
  formatScopes,
  isScopeSubset,
  ALL_SCOPES,
} from "@/lib/oauth/scopes";

describe("oauth/scopes", () => {
  describe("parseScopes", () => {
    it("parses space-separated scopes", () => {
      expect(parseScopes("read write")).toEqual(["read", "write"]);
    });
    it("trims and dedupes", () => {
      expect(parseScopes("  read  read write ")).toEqual(["read", "write"]);
    });
    it("returns empty for empty string", () => {
      expect(parseScopes("")).toEqual([]);
    });
    it("returns empty for undefined", () => {
      expect(parseScopes(undefined)).toEqual([]);
    });
    it("rejects unknown scopes", () => {
      expect(() => parseScopes("read admin")).toThrow(/unknown scope/i);
    });
  });

  describe("formatScopes", () => {
    it("joins with space", () => {
      expect(formatScopes(["read", "write"])).toBe("read write");
    });
  });

  describe("isScopeSubset", () => {
    it("returns true when all requested are in allowed", () => {
      expect(isScopeSubset(["read"], ["read", "write"])).toBe(true);
    });
    it("returns false when a requested scope is missing", () => {
      expect(isScopeSubset(["read", "write"], ["read"])).toBe(false);
    });
    it("returns true for empty requested", () => {
      expect(isScopeSubset([], ["read"])).toBe(true);
    });
  });

  it("ALL_SCOPES is ['read', 'write']", () => {
    expect(ALL_SCOPES).toEqual(["read", "write"]);
  });
});
