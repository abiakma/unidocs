import type { CertificateType, DocumentStatus } from "../generated/prisma/enums.js";
import type { SignatureCheck } from "../signing/signing-provider.types.js";

export type VerificationStatus = "VALID" | "REVOKED" | "EXPIRED" | "NOT_FOUND" | "SIGNATURE_NOT_VERIFIED";

// Public verification payload. Deliberately contains no student personal data.
export interface VerificationResult {
  status: VerificationStatus;
  document: {
    documentNumber: string;
    certificateType: CertificateType;
    issuedAt: string | null;
    validUntil: string | null;
    revokedAt: string | null;
    signerDesignation: string | null;
    signatureCheck: SignatureCheck;
    isTestDocument: boolean;
  } | null;
}

export interface VerificationFacts {
  documentStatus: DocumentStatus;
  validUntil: Date | null;
  signatureCheck: SignatureCheck;
  now: Date;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVerificationTokenFormat(token: string): boolean {
  return UUID_PATTERN.test(token);
}

// Revocation wins over expiry, expiry wins over signature state.
export function computeVerificationStatus(facts: VerificationFacts): VerificationStatus {
  if (facts.documentStatus === "AWAITING_SIGNATURE") return "NOT_FOUND";
  if (facts.documentStatus === "REVOKED") return "REVOKED";
  if (facts.validUntil && facts.validUntil.getTime() < facts.now.getTime()) return "EXPIRED";
  return facts.signatureCheck === "VERIFIED" ? "VALID" : "SIGNATURE_NOT_VERIFIED";
}
