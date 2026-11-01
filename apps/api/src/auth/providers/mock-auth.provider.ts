import { UnauthorizedException } from "@nestjs/common";
import type { AuthProvider, ExternalIdentity } from "./auth-provider.types.js";
import { MOCK_AUTH_PROVIDER_NAME, MOCK_IDENTITIES } from "./mock-identities.js";

// Development-only stand-in for Platonus SSO. The browser is sent to a clearly
// labelled test page where a fictional identity is chosen; its id is the "code".
export class MockAuthProvider implements AuthProvider {
  readonly name = MOCK_AUTH_PROVIDER_NAME;

  constructor(private readonly webBaseUrl: string) {}

  buildAuthorizationUrl(state: string): string {
    const url = new URL("/dev/mock-login", this.webBaseUrl);
    url.searchParams.set("state", state);
    return url.toString();
  }

  async handleCallback(code: string): Promise<ExternalIdentity> {
    const identity = MOCK_IDENTITIES.find((item) => item.id === code);
    if (!identity) throw new UnauthorizedException("Unknown test identity");
    return {
      provider: this.name,
      externalUserId: identity.id,
      kind: identity.kind,
      email: identity.email,
    };
  }
}
