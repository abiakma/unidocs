import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService, type DbClient } from "../prisma/prisma.service.js";

export const AuditAction = {
  LOGIN: "auth.login",
  LOGIN_FAILED: "auth.login_failed",
  LOGOUT: "auth.logout",
  USER_PROVISIONED: "user.provisioned",
  USER_CREATED: "user.created",
  USER_ROLES_CHANGED: "user.roles_changed",
  USER_STATUS_CHANGED: "user.status_changed",
  REQUEST_CREATED: "request.created",
  REQUEST_APPROVED: "request.step_approved",
  REQUEST_REJECTED: "request.rejected",
  DOCUMENT_PREPARED: "document.prepared",
  DOCUMENT_PREPARATION_FAILED: "document.preparation_failed",
  DOCUMENT_SIGNED: "document.signed",
  DOCUMENT_DOWNLOADED: "document.downloaded",
  DOCUMENT_REVOKED: "document.revoked",
  WORKFLOW_UPDATED: "workflow.updated",
} as const;

export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
  userId: string | null;
  action: AuditActionName;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, Prisma.InputJsonValue | null>;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Pass a transaction client to write the log atomically with the change it describes.
  async log(entry: AuditEntry, db: DbClient = this.prisma): Promise<void> {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ?? undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  }
}
