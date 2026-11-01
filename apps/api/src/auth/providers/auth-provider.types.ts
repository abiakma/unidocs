export const AUTH_PROVIDER = Symbol("AUTH_PROVIDER");

export type IdentityKind = "student" | "staff";

// Identity confirmed by the external identity provider. Never contains passwords.
export interface ExternalIdentity {
  provider: string;
  externalUserId: string;
  kind: IdentityKind;
  email: string | null;
}

export interface AuthProvider {
  readonly name: string;
  // Where to send the browser to start login. `state` must come back unchanged to the callback.
  buildAuthorizationUrl(state: string): string;
  // Exchanges the callback parameters for a verified identity.
  handleCallback(code: string): Promise<ExternalIdentity>;
}
