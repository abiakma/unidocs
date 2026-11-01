import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { AuditAction, AuditService } from "../audit/audit.service.js";
import { type AuthContext, hasAnyRole, STAFF_ROLES } from "../common/auth-context.js";
import { DocumentsService } from "../documents/documents.service.js";
import type { RequestStatus } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  isEligibleForCertificate,
  STUDENT_DATA_PROVIDER,
  type StudentDataProvider,
} from "../students/student-data.types.js";
import {
  checkCanDecide,
  type DecisionDeniedReason,
  OPEN_STATUSES,
  parseWorkflowSnapshot,
  stateAfterApproval,
} from "../workflow/workflow-rules.js";
import { WorkflowService } from "../workflow/workflow.service.js";
import type { CreateRequestDto } from "./dto/request.dto.js";
import { REQUEST_INCLUDE, type RequestView, type StaffRequestView, toRequestView } from "./request-view.js";

export const MAX_OPEN_REQUESTS_PER_STUDENT = 5;

const DENIED_MESSAGES: Record<DecisionDeniedReason, string> = {
  NOT_ACTIONABLE: "This request is not waiting for a decision",
  WRONG_ROLE: "Your role is not allowed to decide this workflow step",
  OWN_REQUEST: "You cannot decide your own request",
  ALREADY_DECIDED_BY_USER: "You already approved another step of this request",
};

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workflow: WorkflowService,
    private readonly documents: DocumentsService,
    @Inject(STUDENT_DATA_PROVIDER) private readonly students: StudentDataProvider,
  ) {}

  async create(student: AuthContext, dto: CreateRequestDto, ipAddress: string | null): Promise<RequestView> {
    const status = await this.students.getStudentAcademicStatus(student.externalUserId);
    if (!status) throw new ForbiddenException("Student record not found");
    if (!isEligibleForCertificate(status.educationStatus, dto.certificateType)) {
      throw new UnprocessableEntityException(
        `Your education status (${status.educationStatus}) does not allow this certificate`,
      );
    }

    const openCount = await this.prisma.certificateRequest.count({
      where: { studentUserId: student.userId, status: { in: [...OPEN_STATUSES, "APPROVED", "AWAITING_SIGNATURE"] } },
    });
    if (openCount >= MAX_OPEN_REQUESTS_PER_STUDENT) {
      throw new ConflictException(`You can have at most ${MAX_OPEN_REQUESTS_PER_STUDENT} requests in progress`);
    }

    const steps = await this.workflow.getStepsFor(dto.certificateType);
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.certificateRequest.create({
        data: {
          studentUserId: student.userId,
          certificateType: dto.certificateType,
          purpose: dto.purpose,
          purposeDetails: dto.purposeDetails || null,
          language: dto.language ?? "KK",
          workflowSnapshot: steps.map((step) => ({ role: step.role, name: step.name })),
        },
        include: REQUEST_INCLUDE,
      });
      await this.audit.log(
        {
          userId: student.userId,
          action: AuditAction.REQUEST_CREATED,
          entityType: "CertificateRequest",
          entityId: created.id,
          metadata: { certificateType: dto.certificateType },
          ipAddress,
        },
        tx,
      );
      return created;
    });

    return toRequestView(request);
  }

  async listMine(studentUserId: string): Promise<RequestView[]> {
    const requests = await this.prisma.certificateRequest.findMany({
      where: { studentUserId },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return requests.map(toRequestView);
  }

  // Owner student or any staff member. Everyone else gets 404 so IDs cannot be probed.
  async getForUser(id: string, user: AuthContext): Promise<RequestView | StaffRequestView> {
    const request = await this.prisma.certificateRequest.findUnique({
      where: { id },
      include: { ...REQUEST_INCLUDE, student: { select: { id: true, externalUserId: true } } },
    });
    if (!request) throw new NotFoundException("Request not found");

    if (hasAnyRole(user, STAFF_ROLES)) {
      const names = await this.studentNames([request.student.externalUserId]);
      return {
        ...toRequestView(request),
        student: {
          userId: request.student.id,
          externalStudentId: request.student.externalUserId,
          fullName: names.get(request.student.externalUserId) ?? null,
        },
      };
    }
    if (request.studentUserId !== user.userId) throw new NotFoundException("Request not found");
    return toRequestView(request);
  }

  // Requests whose current step belongs to one of the user's roles.
  async listActionable(user: AuthContext): Promise<StaffRequestView[]> {
    const requests = await this.prisma.certificateRequest.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
      include: { ...REQUEST_INCLUDE, student: { select: { id: true, externalUserId: true } } },
      orderBy: { createdAt: "asc" },
      take: 500,
    });

    const actionable = requests.filter((request) => {
      const step = parseWorkflowSnapshot(request.workflowSnapshot)[request.currentStepIndex];
      return step !== undefined && user.roles.includes(step.role);
    });
    return this.withStudentNames(actionable);
  }

  async listAll(status: RequestStatus | undefined): Promise<StaffRequestView[]> {
    const requests = await this.prisma.certificateRequest.findMany({
      where: status ? { status } : {},
      include: { ...REQUEST_INCLUDE, student: { select: { id: true, externalUserId: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return this.withStudentNames(requests);
  }

  async approve(id: string, user: AuthContext, comment: string | null, ipAddress: string | null): Promise<RequestView> {
    const newStatus = await this.prisma.$transaction(async (tx) => {
      const request = await tx.certificateRequest.findUnique({ where: { id }, include: { approvals: true } });
      if (!request) throw new NotFoundException("Request not found");

      const steps = parseWorkflowSnapshot(request.workflowSnapshot);
      const check = checkCanDecide(
        { status: request.status, currentStepIndex: request.currentStepIndex, studentUserId: request.studentUserId, steps },
        { userId: user.userId, roles: user.roles },
        request.approvals.map((approval) => approval.approverId),
      );
      if (!check.allowed) throw new ForbiddenException(DENIED_MESSAGES[check.reason]);

      const next = stateAfterApproval(steps, request.currentStepIndex);
      const updated = await tx.certificateRequest.updateMany({
        where: { id, status: request.status, currentStepIndex: request.currentStepIndex },
        data: next,
      });
      if (updated.count !== 1) throw new ConflictException("The request was changed by someone else. Reload and try again.");

      await tx.approval.create({
        data: {
          requestId: id,
          approverId: user.userId,
          stepIndex: request.currentStepIndex,
          stepRole: check.step.role,
          decision: "APPROVED",
          comment,
        },
      });
      await this.audit.log(
        {
          userId: user.userId,
          action: AuditAction.REQUEST_APPROVED,
          entityType: "CertificateRequest",
          entityId: id,
          metadata: { stepIndex: request.currentStepIndex, stepRole: check.step.role, newStatus: next.status },
          ipAddress,
        },
        tx,
      );
      return next.status;
    });

    if (newStatus === "APPROVED") await this.tryPrepareDocument(id, user.userId, ipAddress);
    return this.getForUser(id, user);
  }

  async reject(id: string, user: AuthContext, comment: string, ipAddress: string | null): Promise<RequestView> {
    await this.prisma.$transaction(async (tx) => {
      const request = await tx.certificateRequest.findUnique({ where: { id }, include: { approvals: true } });
      if (!request) throw new NotFoundException("Request not found");

      const steps = parseWorkflowSnapshot(request.workflowSnapshot);
      // Rejecting needs the same right as approving the current step, minus separation of duties.
      const check = checkCanDecide(
        { status: request.status, currentStepIndex: request.currentStepIndex, studentUserId: request.studentUserId, steps },
        { userId: user.userId, roles: user.roles },
        [],
      );
      if (!check.allowed) throw new ForbiddenException(DENIED_MESSAGES[check.reason]);

      const updated = await tx.certificateRequest.updateMany({
        where: { id, status: request.status, currentStepIndex: request.currentStepIndex },
        data: { status: "REJECTED" },
      });
      if (updated.count !== 1) throw new ConflictException("The request was changed by someone else. Reload and try again.");

      await tx.approval.create({
        data: {
          requestId: id,
          approverId: user.userId,
          stepIndex: request.currentStepIndex,
          stepRole: check.step.role,
          decision: "REJECTED",
          comment,
        },
      });
      await this.audit.log(
        {
          userId: user.userId,
          action: AuditAction.REQUEST_REJECTED,
          entityType: "CertificateRequest",
          entityId: id,
          metadata: { stepIndex: request.currentStepIndex, stepRole: check.step.role },
          ipAddress,
        },
        tx,
      );
    });

    return this.getForUser(id, user);
  }

  // Preparation failures (e.g. Platonus down) keep the request APPROVED; the signer can retry later.
  private async tryPrepareDocument(requestId: string, actorId: string, ipAddress: string | null): Promise<void> {
    try {
      await this.documents.prepareForSigning(requestId, actorId, ipAddress);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Document preparation for ${requestId} failed: ${message}`);
      await this.audit.log({
        userId: actorId,
        action: AuditAction.DOCUMENT_PREPARATION_FAILED,
        entityType: "CertificateRequest",
        entityId: requestId,
        metadata: { reason: message.slice(0, 300) },
        ipAddress,
      });
    }
  }

  private async withStudentNames(
    requests: (Parameters<typeof toRequestView>[0] & { student: { id: string; externalUserId: string } })[],
  ): Promise<StaffRequestView[]> {
    const names = await this.studentNames(requests.map((request) => request.student.externalUserId));
    return requests.map((request) => ({
      ...toRequestView(request),
      student: {
        userId: request.student.id,
        externalStudentId: request.student.externalUserId,
        fullName: names.get(request.student.externalUserId) ?? null,
      },
    }));
  }

  // Names are looked up live; a lookup failure only hides the name, it never blocks the list.
  private async studentNames(externalIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(externalIds)];
    const results = await Promise.allSettled(unique.map((id) => this.students.getStudentById(id)));
    const names = new Map<string, string>();
    results.forEach((result, index) => {
      const id = unique[index];
      if (result.status === "fulfilled" && result.value && id) names.set(id, result.value.fullName);
    });
    return names;
  }
}
