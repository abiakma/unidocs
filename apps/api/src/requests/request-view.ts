import type {
  ApprovalDecision,
  CertificatePurpose,
  CertificateType,
  DocumentLanguage,
  DocumentStatus,
  RequestStatus,
  RoleName,
} from "../generated/prisma/enums.js";
import { parseWorkflowSnapshot, type WorkflowStepSnapshot } from "../workflow/workflow-rules.js";

export interface ApprovalView {
  stepIndex: number;
  stepRole: RoleName;
  decision: ApprovalDecision;
  comment: string | null;
  approverName: string | null;
  createdAt: string;
}

export interface RequestView {
  id: string;
  certificateType: CertificateType;
  purpose: CertificatePurpose;
  purposeDetails: string | null;
  language: DocumentLanguage;
  status: RequestStatus;
  currentStepIndex: number;
  steps: WorkflowStepSnapshot[];
  approvals: ApprovalView[];
  document: { id: string; documentNumber: string; status: DocumentStatus; isTest: boolean } | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffRequestView extends RequestView {
  student: { userId: string; externalStudentId: string; fullName: string | null };
}

export interface RequestWithRelations {
  id: string;
  certificateType: CertificateType;
  purpose: CertificatePurpose;
  purposeDetails: string | null;
  language: DocumentLanguage;
  status: RequestStatus;
  currentStepIndex: number;
  workflowSnapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
  approvals: {
    stepIndex: number;
    stepRole: RoleName;
    decision: ApprovalDecision;
    comment: string | null;
    createdAt: Date;
    approver: { displayName: string | null };
  }[];
  document: { id: string; documentNumber: string; status: DocumentStatus; isTest: boolean } | null;
}

export const REQUEST_INCLUDE = {
  approvals: { orderBy: { stepIndex: "asc" }, include: { approver: { select: { displayName: true } } } },
  document: { select: { id: true, documentNumber: true, status: true, isTest: true } },
} as const;

export function toRequestView(request: RequestWithRelations): RequestView {
  return {
    id: request.id,
    certificateType: request.certificateType,
    purpose: request.purpose,
    purposeDetails: request.purposeDetails,
    language: request.language,
    status: request.status,
    currentStepIndex: request.currentStepIndex,
    steps: parseWorkflowSnapshot(request.workflowSnapshot),
    approvals: request.approvals.map((approval) => ({
      stepIndex: approval.stepIndex,
      stepRole: approval.stepRole,
      decision: approval.decision,
      comment: approval.comment,
      approverName: approval.approver.displayName,
      createdAt: approval.createdAt.toISOString(),
    })),
    document: request.document,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}
