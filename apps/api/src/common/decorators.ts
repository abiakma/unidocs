import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import type { RoleName } from "../generated/prisma/enums.js";
import type { AppRequest, AuthContext } from "./auth-context.js";

export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";

// Route needs no session. A session is still attached when present.
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

// Route needs at least one of these roles.
export const Roles = (...roles: RoleName[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const request = context.switchToHttp().getRequest<AppRequest>();
  if (!request.auth) throw new UnauthorizedException();
  return request.auth;
});
