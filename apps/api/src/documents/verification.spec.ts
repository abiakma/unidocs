import { describe, expect, it } from "vitest";
import { computeVerificationStatus, isVerificationTokenFormat } from "./verification.js";

const now = new Date("2026-06-01T00:00:00Z");
const future = new Date("2026-12-01T00:00:00Z");
const past = new Date("2026-01-01T00:00:00Z");

describe("computeVerificationStatus", () => {
  it("is VALID only with a verified signature", () => {
    expect(computeVerificationStatus({ documentStatus: "ISSUED", validUntil: future, signatureCheck: "VERIFIED", now })).toBe("VALID");
  });

  it("never reports a mock-signed document as VALID", () => {
    expect(computeVerificationStatus({ documentStatus: "ISSUED", validUntil: future, signatureCheck: "TEST_ONLY", now })).toBe(
      "SIGNATURE_NOT_VERIFIED",
    );
  });

  it("reports REVOKED before anything else", () => {
    expect(computeVerificationStatus({ documentStatus: "REVOKED", validUntil: past, signatureCheck: "VERIFIED", now })).toBe("REVOKED");
  });

  it("reports EXPIRED when the validity date has passed", () => {
    expect(computeVerificationStatus({ documentStatus: "ISSUED", validUntil: past, signatureCheck: "VERIFIED", now })).toBe("EXPIRED");
  });

  it("hides documents that were never issued", () => {
    expect(
      computeVerificationStatus({ documentStatus: "AWAITING_SIGNATURE", validUntil: future, signatureCheck: "VERIFIED", now }),
    ).toBe("NOT_FOUND");
  });
});

describe("isVerificationTokenFormat", () => {
  it("accepts UUID v4 tokens only", () => {
    expect(isVerificationTokenFormat("1dc9e41a-5783-47f8-960a-09f7d3b210c7")).toBe(true);
    expect(isVerificationTokenFormat("1")).toBe(false);
    expect(isVerificationTokenFormat("../../etc/passwd")).toBe(false);
    expect(isVerificationTokenFormat("1dc9e41a-5783-17f8-960a-09f7d3b210c7")).toBe(false);
  });
});
