import { api } from "./client";
import type {
  AdminUser,
  AuditLogEntry,
  CertificatePurpose,
  CertificateType,
  DocumentLanguage,
  DocumentSummary,
  MeResponse,
  MockIdentity,
  Page,
  RequestStatus,
  RequestView,
  RoleName,
  SigningQueue,
  StaffRequestDetails,
  StudentAcademicProfile,
  SystemConfig,
  VerificationResult,
  WorkflowConfiguration,
  WorkflowStep,
} from "./types";

const id = (value: string): string => encodeURIComponent(value);

export const authApi = {
  me: (signal?: AbortSignal) => api<MeResponse>("/auth/me", { signal }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
  mockIdentities: (signal?: AbortSignal) => api<MockIdentity[]>("/auth/mock/identities", { signal }),
};

export const studentApi = {
  profile: (signal?: AbortSignal) => api<StudentAcademicProfile>("/students/me", { signal }),
};

export interface NewRequestInput {
  certificateType: CertificateType;
  purpose: CertificatePurpose;
  purposeDetails?: string;
  language: DocumentLanguage;
}

export const requestsApi = {
  create: (input: NewRequestInput) => api<RequestView>("/requests", { method: "POST", body: input }),
  mine: (signal?: AbortSignal) => api<RequestView[]>("/requests/my", { signal }),
  get: (requestId: string, signal?: AbortSignal) => api<RequestView>(`/requests/${id(requestId)}`, { signal }),
};

export const staffApi = {
  queue: (signal?: AbortSignal) => api<RequestView[]>("/staff/requests", { signal }),
  details: (requestId: string, signal?: AbortSignal) =>
    api<StaffRequestDetails>(`/staff/requests/${id(requestId)}`, { signal }),
  approve: (requestId: string, comment: string) =>
    api<RequestView>(`/staff/requests/${id(requestId)}/approve`, { method: "POST", body: comment ? { comment } : {} }),
  reject: (requestId: string, comment: string) =>
    api<RequestView>(`/staff/requests/${id(requestId)}/reject`, { method: "POST", body: { comment } }),
};

export const documentsApi = {
  mine: (signal?: AbortSignal) => api<DocumentSummary[]>("/documents/my", { signal }),
  signingQueue: (signal?: AbortSignal) => api<SigningQueue>("/documents/signing-queue", { signal }),
  sign: (documentId: string) => api<DocumentSummary>(`/documents/${id(documentId)}/sign`, { method: "POST", body: {} }),
  prepare: (requestId: string) => api<DocumentSummary>(`/documents/requests/${id(requestId)}/prepare`, { method: "POST" }),
  verify: (token: string, signal?: AbortSignal) => api<VerificationResult>(`/documents/verify/${id(token)}`, { signal }),
};

export const adminApi = {
  users: (search: string, signal?: AbortSignal) =>
    api<AdminUser[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`, { signal }),
  createUser: (input: { externalUserId: string; displayName: string; jobTitle: string; email?: string; roles: RoleName[] }) =>
    api<AdminUser>("/admin/users", { method: "POST", body: input }),
  updateRoles: (userId: string, roles: RoleName[]) =>
    api<AdminUser>(`/admin/users/${id(userId)}/roles`, { method: "PATCH", body: { roles } }),
  updateStatus: (userId: string, isActive: boolean) =>
    api<AdminUser>(`/admin/users/${id(userId)}/status`, { method: "PATCH", body: { isActive } }),
  requests: (status: RequestStatus | "", signal?: AbortSignal) =>
    api<RequestView[]>(`/admin/requests${status ? `?status=${status}` : ""}`, { signal }),
  revoke: (documentId: string, reason: string) =>
    api<DocumentSummary>(`/admin/documents/${id(documentId)}/revoke`, { method: "POST", body: { reason } }),
  workflow: (signal?: AbortSignal) => api<WorkflowConfiguration>("/admin/workflow", { signal }),
  updateWorkflow: (certificateType: CertificateType | null, steps: WorkflowStep[]) =>
    api<WorkflowConfiguration>("/admin/workflow", { method: "PUT", body: { certificateType, steps } }),
  auditLogs: (page: number, signal?: AbortSignal) =>
    api<Page<AuditLogEntry>>(`/admin/audit-logs?page=${page}&pageSize=25`, { signal }),
  config: (signal?: AbortSignal) => api<SystemConfig>("/admin/config", { signal }),
};
