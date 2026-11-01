import { describe, expect, it } from "vitest";
import { MockAuthProvider } from "./mock-auth.provider.js";
import { PlatonusSsoProvider } from "./platonus-sso.provider.js";

describe("MockAuthProvider", () => {
  const provider = new MockAuthProvider("http://localhost:5173");

  it("sends the browser to the labelled mock login page with the state", () => {
    expect(provider.buildAuthorizationUrl("abc")).toBe("http://localhost:5173/dev/mock-login?state=abc");
  });

  it("resolves fictional students and staff", async () => {
    await expect(provider.handleCallback("PL-100001")).resolves.toMatchObject({ kind: "student", externalUserId: "PL-100001" });
    await expect(provider.handleCallback("staff-signer")).resolves.toMatchObject({ kind: "staff" });
  });

  it("rejects unknown identities", async () => {
    await expect(provider.handleCallback("someone-else")).rejects.toThrow("Unknown test identity");
  });
});

describe("PlatonusSsoProvider", () => {
  it("stays disabled without official configuration", () => {
    const provider = new PlatonusSsoProvider({
      ssoIssuerUrl: null,
      ssoClientId: null,
      ssoClientSecret: null,
      ssoRedirectUri: null,
      apiBaseUrl: null,
      apiToken: null,
      apiTimeoutMs: 1000,
      apiMaxRetries: 0,
    });
    expect(() => provider.buildAuthorizationUrl("state")).toThrow(/not configured/);
  });
});
