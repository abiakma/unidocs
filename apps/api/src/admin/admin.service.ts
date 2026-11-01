import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, AuditService } from "../audit/audit.service.js";
import { SessionService } from "../auth/session.service.js";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { RoleName } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuditLogsQueryDto, CreateStaffUserDto, UsersQueryDto } from "./dto/admin.dto.js";

export interface AdminUserView {
  id: string;
  externalUserId: string;
  authProvider: string;
  displayName: string | null;
  jobTitle: string | null;
  email: string | null;
  isActive: boolean;
  roles: RoleName[];
  createdAt: string;
}

export interface AuditLogView {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Prisma.JsonValue;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; displayName: string | null; externalUserId: string } | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const USER_INCLUDE = { roles: { include: { role: true } } } as const;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

function toUserView(user: UserWithRoles): AdminUserView {
  return {
    id: user.id,
    externalUserId: user.externalUserId,
    authProvider: user.authProvider,
    displayName: user.displayName,
    jobTitle: user.jobTitle,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles.map((item) => item.role.name),
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async listUsers(query: UsersQueryDto): Promise<AdminUserView[]> {
    const search = query.search;
    const users = await this.prisma.user.findMany({
      where: {
        ...(query.role ? { roles: { some: { role: { name: query.role } } } } : {}),
        ...(search
          ? {
              OR: [
                { externalUserId: { contains: search, mode: "insensitive" } },
                { displayName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: USER_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return users.map(toUserView);
  }

  // Staff are provisioned explicitly. Students are created on first Platonus login.
  async createStaffUser(dto: CreateStaffUserDto, actorId: string, ipAddress: string | null): Promise<AdminUserView> {
    if (dto.roles.length === 0) throw new BadRequestException("At least one role is required");

    const user = await this.prisma.$transaction(async (tx) => {
      const roles = await tx.role.findMany({ where: { name: { in: dto.roles } } });
      const created = await tx.user.create({
        data: {
          authProvider: this.config.authProvider,
          externalUserId: dto.externalUserId,
          displayName: dto.displayName,
          jobTitle: dto.jobTitle,
          email: dto.email ?? null,
          roles: { create: roles.map((role) => ({ roleId: role.id, assignedById: actorId })) },
        },
        include: USER_INCLUDE,
      });
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.USER_CREATED,
          entityType: "User",
          entityId: created.id,
          metadata: { roles: dto.roles },
          ipAddress,
        },
        tx,
      );
      return created;
    });
    return toUserView(user);
  }

  async updateRoles(targetId: string, roles: RoleName[], actorId: string, ipAddress: string | null): Promise<AdminUserView> {
    // Nobody can grant (or remove) their own privileges.
    if (targetId === actorId) throw new ForbiddenException("You cannot change your own roles");
    if (roles.length === 0) throw new BadRequestException("At least one role is required");
    if (roles.includes("STUDENT")) throw new BadRequestException("The STUDENT role is assigned only through Platonus login");

    const user = await this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: targetId }, include: USER_INCLUDE });
      if (!target) throw new NotFoundException("User not found");
      const previous = target.roles.map((item) => item.role.name);
      if (previous.includes("STUDENT")) {
        throw new BadRequestException("Student accounts cannot receive staff roles");
      }

      const roleRows = await tx.role.findMany({ where: { name: { in: roles } } });
      await tx.userRole.deleteMany({ where: { userId: targetId } });
      await tx.userRole.createMany({
        data: roleRows.map((role) => ({ userId: targetId, roleId: role.id, assignedById: actorId })),
      });
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.USER_ROLES_CHANGED,
          entityType: "User",
          entityId: targetId,
          metadata: { previous, next: roles },
          ipAddress,
        },
        tx,
      );
      return tx.user.findUniqueOrThrow({ where: { id: targetId }, include: USER_INCLUDE });
    });
    return toUserView(user);
  }

  async updateStatus(targetId: string, isActive: boolean, actorId: string, ipAddress: string | null): Promise<AdminUserView> {
    if (targetId === actorId) throw new ForbiddenException("You cannot change your own account status");

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: targetId }, data: { isActive }, include: USER_INCLUDE });
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.USER_STATUS_CHANGED,
          entityType: "User",
          entityId: targetId,
          metadata: { isActive },
          ipAddress,
        },
        tx,
      );
      return updated;
    });
    if (!isActive) await this.sessions.destroyAllForUser(targetId);
    return toUserView(user);
  }

  async listAuditLogs(query: AuditLogsQueryDto): Promise<Page<AuditLogView>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, displayName: true, externalUserId: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
        user: log.user,
      })),
    };
  }

  // Non-secret configuration summary for the admin dashboard.
  systemConfiguration(): Record<string, string | number | boolean> {
    return {
      nodeEnv: this.config.nodeEnv,
      authProvider: this.config.authProvider,
      studentDataProvider: this.config.studentDataProvider,
      signingProvider: this.config.signingProvider,
      verificationBaseUrl: this.config.verificationBaseUrl,
      certificateValidityDays: this.config.certificateValidityDays,
      sessionTtlHours: this.config.sessionTtlHours,
      platonusSsoConfigured: Boolean(this.config.platonus.ssoClientId),
      platonusApiConfigured: Boolean(this.config.platonus.apiBaseUrl),
    };
  }
}
