import type { SignatureStatus } from "../generated/prisma/enums.js";
import type { PdfMode } from "../documents/pdf/certificate-pdf.js";

export const SIGNING_PROVIDERS = Symbol("SIGNING_PROVIDERS");

export interface SignInput {
  documentId: string;
  documentNumber: string;
  // PDF rendered in `pdfMode` of the provider.
  pdf: Buffer;
  signer: { userId: string; name: string; jobTitle: string };
  // Signature produced on the signer's computer (for example a CMS from NCALayer), base64.
  clientSignature: string | null;
}

export interface SignResult {
  signedPdf: Buffer;
  signatureStatus: SignatureStatus;
  certificateSerial: string | null;
  metadata: Record<string, string | boolean | null>;
}

// VERIFIED is returned only after a real cryptographic check succeeded.
export type SignatureCheck = "VERIFIED" | "NOT_VERIFIED" | "TEST_ONLY";

export interface VerifyInput {
  signatureStatus: SignatureStatus;
  signedPdf: Buffer;
  certificateSerial: string | null;
}

export interface SigningProvider {
  readonly name: string;
  // True only for an approved integration that produces legally valid signatures.
  readonly legallyValid: boolean;
  readonly pdfMode: PdfMode;
  sign(input: SignInput): Promise<SignResult>;
  verify(input: VerifyInput): Promise<SignatureCheck>;
}

export interface SigningProviders {
  active: SigningProvider;
  byName(name: string): SigningProvider | null;
}
