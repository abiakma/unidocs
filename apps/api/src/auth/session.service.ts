import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";
import type { AuthContext } from "../common/auth-context.js";
import { PrismaService } from "../prisma/prisma.service.js";

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

// lastSeenAt is refreshed at most this often to avoid a write per request.
const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Server-side sessions: the cookie holds a random token, the database holds only its hash.
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async create(userId: string, ipAddress: string | null, userAgent: string | null): Promise<CreatedSession> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.config.sessionTtlHours * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        tokenHash: hashSessionToken(token),
        csrfToken: randomBytes(32).toString("base64url"),
        userId,
        ipAddress,
        userAgent: userAgent?.slice(0, 300) ?? null,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async resolve(token: string): Promise<AuthContext | null> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_REFRESH_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }

    return {
      userId: session.user.id,
      sessionId: session.id,
      csrfToken: session.csrfToken,
      roles: session.user.roles.map((userRole) => userRole.role.name),
      authProvider: session.user.authProvider,
      externalUserId: session.user.externalUserId,
      displayName: session.user.displayName,
    };
  }

  async destroy(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async destroyAllForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return result.count;
  }
}
