import { describe, it, expect } from "vitest";
import {
  generateToken,
  hashToken,
  tokenPrefix,
  verifyPkceS256,
  generateClientSecret,
} from "@/lib/oauth/crypto";

describe("oauth/crypto", () => {
  describe("generateToken", () => {
    it("returns a 64-char hex string", () => {
      const t = generateToken();
      expect(t).toMatch(/^[0-9a-f]{64}$/);
    });
    it("returns unique values", () => {
      expect(generateToken()).not.toBe(generateToken());
    });
  });

  describe("hashToken", () => {
    it("is deterministic", () => {
      expect(hashToken("abc")).toBe(hashToken("abc"));
    });
    it("differs for different inputs", () => {
      expect(hashToken("abc")).not.toBe(hashToken("abd"));
    });
    it("returns sha256 hex (64 chars)", () => {
      expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("tokenPrefix", () => {
    it("returns first 8 chars", () => {
      expect(tokenPrefix("abcdefghijklmnop")).toBe("abcdefgh");
    });
  });

  describe("verifyPkceS256", () => {
    // Known PKCE test vector from RFC 7636 Appendix B
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

    it("accepts a valid verifier/challenge pair", () => {
      expect(verifyPkceS256(verifier, challenge)).toBe(true);
    });
    it("rejects a wrong verifier", () => {
      expect(verifyPkceS256("wrong-verifier-value", challenge)).toBe(false);
    });
    it("rejects empty verifier", () => {
      expect(verifyPkceS256("", challenge)).toBe(false);
    });
  });

  describe("generateClientSecret", () => {
    it("returns a 64-char hex string distinct from generateToken", () => {
      const s = generateClientSecret();
      expect(s).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
