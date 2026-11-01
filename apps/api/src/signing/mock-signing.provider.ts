import { createHash } from "node:crypto";
import type { SignatureCheck, SigningProvider, SignInput, SignResult, VerifyInput } from "./signing-provider.types.js";

export const MOCK_SIGNING_NOTICE = "TEST / NOT LEGALLY SIGNED";

/**
 * Development signer. It does NOT create any cryptographic signature: the PDF is
 * rendered with a TEST watermark and stored as is. Never use it in production
 * (the API refuses to start with SIGNING_PROVIDER=mock and NODE_ENV=production).
 */
export class MockSigningProvider implements SigningProvider {
  readonly name = "mock";
  readonly legallyValid = false;
  readonly pdfMode = "TEST_SIGNED" as const;

  async sign(input: SignInput): Promise<SignResult> {
    return {
      signedPdf: input.pdf,
      signatureStatus: "MOCK_TEST_ONLY",
      certificateSerial: null,
      metadata: {
        notice: MOCK_SIGNING_NOTICE,
        sha256: createHash("sha256").update(input.pdf).digest("hex"),
        legallyValid: false,
      },
    };
  }

  async verify(_input: VerifyInput): Promise<SignatureCheck> {
    return "TEST_ONLY";
  }
}
