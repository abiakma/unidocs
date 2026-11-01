import { ServiceUnavailableException } from "@nestjs/common";
import type { PlatonusConfig } from "../../config/app-config.js";
import type { AuthProvider, ExternalIdentity } from "./auth-provider.types.js";

/**
 * Official Platonus single sign-on.
 *
 * DISABLED until AHEU provides the official protocol documentation (OAuth 2.0 /
 * OpenID Connect / SAML) and client credentials. This class intentionally does
 * not guess any endpoint, scrape login pages, or handle student passwords:
 * the student authenticates on Platonus itself and we only receive a result.
 * See docs/authentication-flow.md for the integration checklist.
 */
export class PlatonusSsoProvider implements AuthProvider {
  readonly name = "platonus";

  constructor(private readonly config: PlatonusConfig) {}

  buildAuthorizationUrl(_state: string): string {
    this.assertConfigured();
    // TODO(platonus-docs): build the documented authorization URL with client_id, redirect_uri and state.
    throw this.notImplemented();
  }

  async handleCallback(_code: string): Promise<ExternalIdentity> {
    this.assertConfigured();
    // TODO(platonus-docs): exchange the code server-side, validate the token/assertion
    // signature, issuer and audience, then map the documented student ID claim.
    throw this.notImplemented();
  }

  private assertConfigured(): void {
    const { ssoIssuerUrl, ssoClientId, ssoClientSecret, ssoRedirectUri } = this.config;
    if (!ssoIssuerUrl || !ssoClientId || !ssoClientSecret || !ssoRedirectUri) {
      throw new ServiceUnavailableException("Platonus SSO is not configured");
    }
  }

  private notImplemented(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      "Platonus SSO integration is waiting for official documentation from the university",
    );
  }
}
