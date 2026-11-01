// Shapes returned by the UniDocs API (apps/api).

export const ROLE_NAMES = ["STUDENT", "SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER", "SYSTEM_ADMIN"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];
export const STAFF_ROLE_NAMES = ["SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER", "SYSTEM_ADMIN"] as const;
export const APPROVER_ROLE_NAMES = ["SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER"] as const;

export const CERTIFICATE_TYPES = [
  "ENROLLMENT_CERTIFICATE",
  "STUDENT_STATUS_LETTER",
  "INTERNSHIP_CONFIRMATION",
  "TRANSCRIPT_REQUEST",
  "VISA_SUPPORT_LETTER",
  "GRADUATION_CONFIRMATION",
] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export const PURPOSES = ["EMPLOYMENT", "INTERNSHIP", "VISA_APPLICATION", "SCHOLARSHIP", "BANK", "OTHER"] as const;
export type CertificatePurpose = (typeof PURPOSES)[number];

export const DOCUMENT_LANGUAGES = ["KK", "RU", "EN"] as const;
export type DocumentLanguage = (typeof DOCUMENT_LANGUAGES)[number];

export const REQUEST_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "AWAITING_SIGNATURE", "ISSUED"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type DocumentStatus = "AWAITING_SIGNATURE" | "ISSUED" | "REVOKED";
export type EducationStatus = "ACTIVE" | "ACADEMIC_LEAVE" | "GRADUATED" | "EXPELLED";

export interface MeResponse {
  user: {
    id: string;
    displayName: string | null;
    roles: RoleName[];
    authProvider: string;
    externalUserId: string;
  };
  csrfToken: string;
}

export interface LocalizedText {
  kk: string;
  ru: string;
  en: string;
}

export interface StudentAcademicProfile {
  externalStudentId: string;
  fullName: string;
  faculty: LocalizedText;
  specialty: LocalizedText;
  course: number;
  group: string;
  studyForm: LocalizedText;
  educationStatus: EducationStatus;
  enrollmentDate: string;
  graduationDate: string | null;
}

export interface WorkflowStep {
  role: RoleName;
  name: string;
}

export interface ApprovalView {
  stepIndex: number;
  stepRole: RoleName;
  decision: "APPROVED" | "REJECTED";
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
  steps: WorkflowStep[];
  approvals: ApprovalView[];
  document: { id: string; documentNumber: string; status: DocumentStatus; isTest: boolean } | null;
  createdAt: string;
  updatedAt: string;
  student?: { userId: string; externalStudentId: string; fullName: string | null };
}

export interface StaffRequestDetails {
  request: RequestView;
  academicProfile: StudentAcademicProfile | null;
  academicProfileError: string | null;
}

export interface DocumentSummary {
  id: string;
  requestId: string;
  documentNumber: string;
  certificateType: CertificateType;
  status: DocumentStatus;
  isTest: boolean;
  issuedAt: string | null;
  validUntil: string | null;
  revokedAt: string | null;
  verificationUrl: string | null;
}

export interface SigningQueue {
  signing: { provider: string; legallyValid: boolean };
  awaitingSignature: {
    documentId: string;
    requestId: string;
    documentNumber: string;
    certificateType: CertificateType;
    studentName: string;
    language: DocumentLanguage;
    preparedAt: string;
  }[];
  awaitingPreparation: { requestId: string; certificateType: CertificateType; approvedAt: string }[];
}

export type VerificationStatus = "VALID" | "REVOKED" | "EXPIRED" | "NOT_FOUND" | "SIGNATURE_NOT_VERIFIED";
export type SignatureCheck = "VERIFIED" | "NOT_VERIFIED" | "TEST_ONLY";

export interface VerificationResult {
  status: VerificationStatus;
  document: {
    documentNumber: string;
    certificateType: CertificateType;
    issuedAt: string | null;
    validUntil: string | null;
    revokedAt: string | null;
    signerDesignation: string | null;
    signatureCheck: SignatureCheck;
    isTestDocument: boolean;
  } | null;
}

export interface MockIdentity {
  id: string;
  kind: "student" | "staff";
  label: string;
  roleHint: RoleName;
}

export interface AdminUser {
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

export interface WorkflowConfiguration {
  defaultSteps: WorkflowStep[];
  overrides: Partial<Record<CertificateType, WorkflowStep[]>>;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: JsonValue;
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

export type SystemConfig = Record<string, string | number | boolean>;
