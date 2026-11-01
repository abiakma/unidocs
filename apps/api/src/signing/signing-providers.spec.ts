import { describe, expect, it } from "vitest";
import { MockSigningProvider } from "./mock-signing.provider.js";
import { OfficialSigningProvider } from "./official-signing.provider.js";
import type { SignInput } from "./signing-provider.types.js";

const signInput: SignInput = {
  documentId: "doc-1",
  documentNumber: "AHEU-2026-000001",
  pdf: Buffer.from("%PDF-test"),
  signer: { userId: "u1", name: "Signer", jobTitle: "Rector" },
  clientSignature: null,
};

describe("MockSigningProvider", () => {
  const provider = new MockSigningProvider();

  it("is never legally valid", () => {
    expect(provider.legallyValid).toBe(false);
    expect(provider.pdfMode).toBe("TEST_SIGNED");
  });

  it("marks results as test-only", async () => {
    const result = await provider.sign(signInput);
    expect(result.signatureStatus).toBe("MOCK_TEST_ONLY");
    expect(result.metadata.notice).toBe("TEST / NOT LEGALLY SIGNED");
    expect(result.certificateSerial).toBeNull();
  });

  it("never reports a verified signature", async () => {
    await expect(
      provider.verify({ signatureStatus: "MOCK_TEST_ONLY", signedPdf: signInput.pdf, certificateSerial: null }),
    ).resolves.toBe("TEST_ONLY");
  });
});

describe("OfficialSigningProvider (not configured)", () => {
  const provider = new OfficialSigningProvider();

  it("refuses to sign until implemented", async () => {
    await expect(provider.sign(signInput)).rejects.toThrow(/not configured/);
  });

  it("never claims verification it did not perform", async () => {
    await expect(provider.verify({ signatureStatus: "VALID", signedPdf: signInput.pdf, certificateSerial: "1" })).resolves.toBe(
      "NOT_VERIFIED",
    );
  });
});
