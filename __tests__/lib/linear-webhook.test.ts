import { describe, it, expect } from "vitest";
import { verifyLinearSignature } from "@/lib/linear-webhook";
import { createHmac } from "crypto";

describe("verifyLinearSignature", () => {
  it("returns true for valid signature", () => {
    const body = '{"action":"create"}';
    const secret = "test-secret";
    const expected = createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    expect(verifyLinearSignature(body, expected, secret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(
      verifyLinearSignature('{"action":"create"}', "bad-sig", "secret")
    ).toBe(false);
  });
});
