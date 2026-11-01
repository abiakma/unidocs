import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { AuditAction, AuditService } from "../audit/audit.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { STUDENT_DATA_PROVIDER, type StudentDataProvider } from "../students/student-data.types.js";
import type { ExternalIdentity } from "./providers/auth-provider.types.js";

export interface ResolvedUser {
  id: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STUDENT_DATA_PROVIDER) private readonly students: StudentDataProvider,
  ) {}

  /**
   * Maps a verified external identity to our user.
   * - Students are created on first login if the student data provider knows them.
   * - Staff must be provisioned in advance by a system administrator.
   */
  async resolveUser(identity: ExternalIdentity, ipAddress: string | null): Promise<ResolvedUser> {
    const existing = await this.prisma.user.findUnique({
      where: {
        authProvider_externalUserId: { authProvider: identity.provider, externalUserId: identity.externalUserId },
      },
      include: { roles: { include: { role: true } } },
    });

    if (existing) {
      if (!existing.isActive) throw new ForbiddenException("This account is deactivated");
      return { id: existing.id, roles: existing.roles.map((item) => item.role.name) };
    }

    if (identity.kind !== "student") {
      throw new ForbiddenException("Staff accounts must be provisioned by a system administrator");
    }

    const student = await this.students.getStudentById(identity.externalUserId);
    if (!student) throw new ForbiddenException("Student record not found");

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          authProvider: identity.provider,
          externalUserId: identity.externalUserId,
          email: identity.email,
          roles: { create: { role: { connect: { name: "STUDENT" } } } },
        },
      });
      await this.audit.log(
        {
          userId: created.id,
          action: AuditAction.USER_PROVISIONED,
          entityType: "User",
          entityId: created.id,
          metadata: { provider: identity.provider, role: "STUDENT" },
          ipAddress,
        },
        tx,
      );
      return created;
    });

    return { id: user.id, roles: ["STUDENT"] };
  }
}
