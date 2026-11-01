import type { EducationStatus, LocalizedText, StudentAcademicProfile } from "../students/student-data.types.js";

// Academic data frozen on a document when it is prepared.
export type AcademicSnapshot = StudentAcademicProfile & {
  capturedAt: string;
  source: "mock" | "platonus";
};

const EDUCATION_STATUSES: readonly EducationStatus[] = ["ACTIVE", "ACADEMIC_LEAVE", "GRADUATED", "EXPELLED"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalized(value: unknown): value is LocalizedText {
  return isRecord(value) && typeof value.kk === "string" && typeof value.ru === "string" && typeof value.en === "string";
}

export function parseAcademicSnapshot(value: unknown): AcademicSnapshot {
  if (
    !isRecord(value) ||
    typeof value.externalStudentId !== "string" ||
    typeof value.fullName !== "string" ||
    !isLocalized(value.faculty) ||
    !isLocalized(value.specialty) ||
    !isLocalized(value.studyForm) ||
    typeof value.course !== "number" ||
    typeof value.group !== "string" ||
    typeof value.enrollmentDate !== "string" ||
    !(value.graduationDate === null || typeof value.graduationDate === "string") ||
    !EDUCATION_STATUSES.includes(value.educationStatus as EducationStatus) ||
    typeof value.capturedAt !== "string" ||
    (value.source !== "mock" && value.source !== "platonus")
  ) {
    throw new Error("Stored academic snapshot is invalid");
  }

  return {
    externalStudentId: value.externalStudentId,
    fullName: value.fullName,
    faculty: value.faculty,
    specialty: value.specialty,
    studyForm: value.studyForm,
    course: value.course,
    group: value.group,
    enrollmentDate: value.enrollmentDate,
    graduationDate: value.graduationDate,
    educationStatus: value.educationStatus as EducationStatus,
    capturedAt: value.capturedAt,
    source: value.source,
  };
}
