import type { CertificateType } from "../generated/prisma/enums.js";

export const STUDENT_DATA_PROVIDER = Symbol("STUDENT_DATA_PROVIDER");

export type LocalizedText = {
  kk: string;
  ru: string;
  en: string;
};

export type EducationStatus = "ACTIVE" | "ACADEMIC_LEAVE" | "GRADUATED" | "EXPELLED";

// Academic data owned by Platonus. Read live, never stored except as a document snapshot.
export type StudentAcademicProfile = {
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
};

export interface StudentAcademicStatus {
  externalStudentId: string;
  educationStatus: EducationStatus;
  checkedAt: string;
  source: "mock" | "platonus";
}

// Identity of the signed-in student, as known to the identity provider.
export interface StudentIdentity {
  externalStudentId: string;
}

export interface StudentDataProvider {
  readonly source: "mock" | "platonus";
  // Returns null when the student does not exist. Throws 503 when the source is unavailable.
  getStudentById(externalStudentId: string): Promise<StudentAcademicProfile | null>;
  getCurrentStudent(identity: StudentIdentity): Promise<StudentAcademicProfile>;
  getStudentAcademicStatus(externalStudentId: string): Promise<StudentAcademicStatus | null>;
}

// Which education statuses allow which certificates.
export function isEligibleForCertificate(status: EducationStatus, certificateType: CertificateType): boolean {
  if (certificateType === "GRADUATION_CONFIRMATION") return status === "GRADUATED";
  return status === "ACTIVE";
}
