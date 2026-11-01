import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./app-config.js";

const base = { DATABASE_URL: "postgresql://localhost/db" };

describe("loadConfig", () => {
  it("defaults to mock integrations in development", () => {
    const config = loadConfig(base);
    expect(config).toMatchObject({ authProvider: "mock", studentDataProvider: "mock", signingProvider: "mock" });
  });

  it("refuses mock integrations in production", () => {
    expect(() =>
      loadConfig({ ...base, NODE_ENV: "production", COOKIE_SECURE: "true", VERIFICATION_BASE_URL: "https://certificate.aheu.kz" }),
    ).toThrow(/AUTH_PROVIDER=mock.*STUDENT_DATA_PROVIDER=mock.*SIGNING_PROVIDER=mock/);
  });

  it("requires secure cookies and https verification links in production", () => {
    expect(() =>
      loadConfig({
        ...base,
        NODE_ENV: "production",
        AUTH_PROVIDER: "platonus",
        STUDENT_DATA_PROVIDER: "platonus",
        SIGNING_PROVIDER: "official",
      }),
    ).toThrow(/COOKIE_SECURE.*https/);
  });

  it("rejects invalid values", () => {
    expect(() => loadConfig({ ...base, SIGNING_PROVIDER: "fake" })).toThrow(ConfigError);
    expect(() => loadConfig({ ...base, VERIFICATION_BASE_URL: "javascript:alert(1)" })).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("normalizes the verification base URL", () => {
    expect(loadConfig({ ...base, VERIFICATION_BASE_URL: "https://certificate.aheu.kz/" }).verificationBaseUrl).toBe(
      "https://certificate.aheu.kz",
    );
  });
});
