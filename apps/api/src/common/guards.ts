import { timingSafeEqual } from "node:crypto";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SessionService } from "../auth/session.service.js";
import type { RoleName } from "../generated/prisma/enums.js";
import { type AppRequest, CSRF_HEADER, SESSION_COOKIE } from "./auth-context.js";
import { IS_PUBLIC_KEY, ROLES_KEY } from "./decorators.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isPublic(reflector: Reflector, context: ExecutionContext): boolean {
  return reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) === true;
}

// 1. Loads the session from the HttpOnly cookie. Every route needs one unless marked @Public().
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[SESSION_COOKIE];

    if (typeof token === "string") {
      request.auth = (await this.sessions.resolve(token)) ?? undefined;
    }

    if (request.auth || isPublic(this.reflector, context)) return true;
    throw new UnauthorizedException("Authentication required");
  }
}

// 2. Synchronizer-token CSRF check for every state-changing request made with a session.
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (SAFE_METHODS.has(request.method) || !request.auth) return true;

    const header = request.headers[CSRF_HEADER];
    if (typeof header === "string" && safeEqual(header, request.auth.csrfToken)) return true;
    throw new ForbiddenException("Invalid or missing CSRF token");
  }
}

// 3. Role-based access for routes marked @Roles(...).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AppRequest>();
    if (!request.auth) throw new UnauthorizedException("Authentication required");
    if (request.auth.roles.some((role) => required.includes(role))) return true;
    throw new ForbiddenException("You do not have permission for this action");
  }
}
