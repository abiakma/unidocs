import path from "node:path";

export const APP_CONFIG = Symbol("APP_CONFIG");

export type NodeEnv = "development" | "production" | "test";
export type AuthProviderKind = "mock" | "platonus";
export type StudentDataProviderKind = "mock" | "platonus";
export type SigningProviderKind = "mock" | "official";

export interface PlatonusConfig {
  ssoIssuerUrl: string | null;
  ssoClientId: string | null;
  ssoClientSecret: string | null;
  ssoRedirectUri: string | null;
  apiBaseUrl: string | null;
  apiToken: string | null;
  apiTimeoutMs: number;
  apiMaxRetries: number;
}

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  webBaseUrl: string;
  verificationBaseUrl: string;
  cookieSecure: boolean;
  sessionTtlHours: number;
  trustProxyHops: number;
  storageDir: string;
  certificateValidityDays: number;
  authProvider: AuthProviderKind;
  studentDataProvider: StudentDataProviderKind;
  signingProvider: SigningProviderKind;
  platonus: PlatonusConfig;
}

export class ConfigError extends Error {}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(`Missing required environment variable ${name}`);
  return value;
}

function optional(env: Env, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function integer(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function oneOf<T extends string>(env: Env, name: string, allowed: readonly T[], fallback: T): T {
  const raw = env[name]?.trim() || fallback;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ConfigError(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return raw as T;
}

function url(env: Env, name: string, fallback?: string): string {
  const raw = env[name]?.trim() || fallback;
  if (!raw) throw new ConfigError(`Missing required environment variable ${name}`);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ConfigError(`${name} must be a valid URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ConfigError(`${name} must use http or https`);
  }
  return parsed.origin + parsed.pathname.replace(/\/+$/, "");
}

export function loadConfig(env: Env = process.env): AppConfig {
  const nodeEnv = oneOf(env, "NODE_ENV", ["development", "production", "test"], "development");

  const config: AppConfig = {
    nodeEnv,
    port: integer(env, "API_PORT", 3000, 1, 65535),
    databaseUrl: required(env, "DATABASE_URL"),
    webBaseUrl: url(env, "WEB_BASE_URL", "http://localhost:5173"),
    verificationBaseUrl: url(env, "VERIFICATION_BASE_URL", "http://localhost:5173"),
    cookieSecure: env.COOKIE_SECURE?.trim() === "true",
    sessionTtlHours: integer(env, "SESSION_TTL_HOURS", 8, 1, 72),
    trustProxyHops: integer(env, "TRUST_PROXY_HOPS", 0, 0, 10),
    storageDir: path.resolve(env.STORAGE_DIR?.trim() || "./storage"),
    certificateValidityDays: integer(env, "CERTIFICATE_VALIDITY_DAYS", 90, 1, 3650),
    authProvider: oneOf(env, "AUTH_PROVIDER", ["mock", "platonus"], "mock"),
    studentDataProvider: oneOf(env, "STUDENT_DATA_PROVIDER", ["mock", "platonus"], "mock"),
    signingProvider: oneOf(env, "SIGNING_PROVIDER", ["mock", "official"], "mock"),
    platonus: {
      ssoIssuerUrl: optional(env, "PLATONUS_SSO_ISSUER_URL"),
      ssoClientId: optional(env, "PLATONUS_SSO_CLIENT_ID"),
      ssoClientSecret: optional(env, "PLATONUS_SSO_CLIENT_SECRET"),
      ssoRedirectUri: optional(env, "PLATONUS_SSO_REDIRECT_URI"),
      apiBaseUrl: optional(env, "PLATONUS_API_BASE_URL"),
      apiToken: optional(env, "PLATONUS_API_TOKEN"),
      apiTimeoutMs: integer(env, "PLATONUS_API_TIMEOUT_MS", 5000, 500, 60000),
      apiMaxRetries: integer(env, "PLATONUS_API_MAX_RETRIES", 2, 0, 5),
    },
  };

  assertProductionSafe(config);
  return config;
}

// Refuses to start a production server with test integrations or insecure cookies.
export function assertProductionSafe(config: AppConfig): void {
  if (config.nodeEnv !== "production") return;

  const problems: string[] = [];
  if (config.authProvider === "mock") problems.push("AUTH_PROVIDER=mock");
  if (config.studentDataProvider === "mock") problems.push("STUDENT_DATA_PROVIDER=mock");
  if (config.signingProvider === "mock") problems.push("SIGNING_PROVIDER=mock");
  if (!config.cookieSecure) problems.push("COOKIE_SECURE must be true");
  if (!config.verificationBaseUrl.startsWith("https://")) problems.push("VERIFICATION_BASE_URL must use https");

  if (problems.length > 0) {
    throw new ConfigError(`Unsafe production configuration: ${problems.join("; ")}`);
  }
}
