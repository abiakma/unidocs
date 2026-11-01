import { ServiceUnavailableException } from "@nestjs/common";
import type { SignatureCheck, SigningProvider, SignInput, SignResult, VerifyInput } from "./signing-provider.types.js";

/**
 * Placeholder for the approved Kazakhstan EDS integration (NCALayer on the
 * signer's computer + certificate validation against NCA RK, OCSP/CRL).
 *
 * Not implemented: no government API is assumed or simulated. Private keys and
 * their passwords must never reach this server; the signer signs locally with
 * NCALayer and only the resulting signature is sent here for validation.
 * See docs/digital-signature.md.
 */
export class OfficialSigningProvider implements SigningProvider {
  readonly name = "official";
  readonly legallyValid = true;
  readonly pdfMode = "OFFICIAL" as const;

  async sign(_input: SignInput): Promise<SignResult> {
    // TODO(eds): validate the client CMS signature, the signer certificate chain,
    // revocation status and that the certificate belongs to this authorized signer.
    throw new ServiceUnavailableException("Official digital signing is not configured yet");
  }

  async verify(_input: VerifyInput): Promise<SignatureCheck> {
    // Until real verification is implemented, never report a signature as verified.
    return "NOT_VERIFIED";
  }
}
