import { randomBytes } from "node:crypto";
import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Logger,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ApiCookieAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { CookieOptions, Response } from "express";
import { AuditAction, AuditService } from "../audit/audit.service.js";
import {
  type AppRequest,
  type AuthContext,
  clientIp,
  LOGIN_STATE_COOKIE,
  SESSION_COOKIE,
} from "../common/auth-context.js";
import { CurrentUser, Public } from "../common/decorators.js";
import { safeEqual } from "../common/guards.js";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";
import { AuthService } from "./auth.service.js";
import { AUTH_PROVIDER, type AuthProvider } from "./providers/auth-provider.types.js";
import { MOCK_IDENTITIES, type MockIdentity } from "./providers/mock-identities.js";
import { SessionService } from "./session.service.js";

const LOGIN_STATE_TTL_MS = 10 * 60 * 1000;

export interface MeResponse {
  user: {
    id: string;
    displayName: string | null;
    roles: string[];
    authProvider: string;
    externalUserId: string;
  };
  csrfToken: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  @Get("login")
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Start login: redirects to Platonus SSO (or the mock login in development)" })
  login(@Res() response: Response): void {
    const state = randomBytes(24).toString("base64url");
    response.cookie(LOGIN_STATE_COOKIE, state, this.cookieOptions(LOGIN_STATE_TTL_MS, "/api/auth"));
    response.redirect(302, this.provider.buildAuthorizationUrl(state));
  }

  @Get("callback")
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Identity provider callback: creates a session and redirects to the web app" })
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() request: AppRequest,
    @Res() response: Response,
  ): Promise<void> {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const expectedState = cookies?.[LOGIN_STATE_COOKIE];
    response.clearCookie(LOGIN_STATE_COOKIE, this.cookieOptions(0, "/api/auth"));
    const ipAddress = clientIp(request);

    if (typeof expectedState !== "string" || typeof state !== "string" || !safeEqual(state, expectedState)) {
      return this.redirectToLoginError(response, "state");
    }
    if (typeof code !== "string" || code.length === 0 || code.length > 2048) {
      return this.redirectToLoginError(response, "denied");
    }

    try {
      const identity = await this.provider.handleCallback(code);
      const user = await this.authService.resolveUser(identity, ipAddress);
      const session = await this.sessions.create(user.id, ipAddress, request.get("user-agent") ?? null);

      response.cookie(SESSION_COOKIE, session.token, {
        ...this.cookieOptions(session.expiresAt.getTime() - Date.now(), "/"),
      });
      await this.audit.log({
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: "User",
        entityId: user.id,
        metadata: { provider: identity.provider },
        ipAddress,
      });
      response.redirect(302, new URL("/dashboard", this.config.webBaseUrl).toString());
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      this.logger.warn(`Login failed with status ${status}`);
      await this.audit.log({
        userId: null,
        action: AuditAction.LOGIN_FAILED,
        entityType: "User",
        metadata: { provider: this.provider.name, status },
        ipAddress,
      });
      this.redirectToLoginError(response, status === 503 ? "unavailable" : "denied");
    }
  }

  @Get("me")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Current session user and the CSRF token for state-changing requests" })
  @ApiOkResponse({ description: "Signed-in user" })
  me(@CurrentUser() user: AuthContext): MeResponse {
    return {
      user: {
        id: user.userId,
        displayName: user.displayName,
        roles: user.roles,
        authProvider: user.authProvider,
        externalUserId: user.externalUserId,
      },
      csrfToken: user.csrfToken,
    };
  }

  @Post("logout")
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiOperation({ summary: "End the current session" })
  @ApiNoContentResponse()
  async logout(
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.destroy(user.sessionId);
    response.clearCookie(SESSION_COOKIE, this.cookieOptions(0, "/"));
    await this.audit.log({
      userId: user.userId,
      action: AuditAction.LOGOUT,
      entityType: "User",
      entityId: user.userId,
      ipAddress: clientIp(request),
    });
  }

  @Get("mock/identities")
  @Public()
  @ApiOperation({ summary: "DEVELOPMENT ONLY: fictional identities for the mock login page" })
  mockIdentities(): readonly MockIdentity[] {
    if (this.config.authProvider !== "mock" || this.config.nodeEnv === "production") {
      throw new NotFoundException();
    }
    return MOCK_IDENTITIES;
  }

  private cookieOptions(maxAgeMs: number, path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: "lax",
      path,
      ...(maxAgeMs > 0 ? { maxAge: maxAgeMs } : {}),
    };
  }

  private redirectToLoginError(response: Response, reason: "state" | "denied" | "unavailable"): void {
    const url = new URL("/login", this.config.webBaseUrl);
    url.searchParams.set("error", reason);
    response.redirect(302, url.toString());
  }
}
