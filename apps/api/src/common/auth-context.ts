import type { Request } from "express";
import type { RoleName } from "../generated/prisma/enums.js";

export interface AuthContext {
  userId: string;
  sessionId: string;
  csrfToken: string;
  roles: RoleName[];
  authProvider: string;
  externalUserId: string;
  displayName: string | null;
}

export interface AppRequest extends Request {
  auth?: AuthContext;
}

export const SESSION_COOKIE = "unidocs_sid";
export const LOGIN_STATE_COOKIE = "unidocs_login_state";
export const CSRF_HEADER = "x-csrf-token";

export const STAFF_ROLES: readonly RoleName[] = [
  "SPECIALIST",
  "ACCOUNTANT",
  "AUTHORIZED_SIGNER",
  "SYSTEM_ADMIN",
];

export function hasAnyRole(auth: AuthContext, roles: readonly RoleName[]): boolean {
  return auth.roles.some((role) => roles.includes(role));
}

export function clientIp(request: Request): string | null {
  return request.ip ?? null;
}
