import type { RoleName } from "../../generated/prisma/enums.js";
import type { IdentityKind } from "./auth-provider.types.js";

// FICTIONAL identities for the development mock login. Students match MOCK_STUDENTS;
// staff are provisioned by the seed script (prisma/seed.ts).
export interface MockIdentity {
  id: string;
  kind: IdentityKind;
  label: string;
  roleHint: RoleName;
  email: string | null;
}

export const MOCK_AUTH_PROVIDER_NAME = "mock";

export const MOCK_IDENTITIES: readonly MockIdentity[] = [
  { id: "PL-100001", kind: "student", label: "Сейітова Айгерім (3 курс, ACTIVE)", roleHint: "STUDENT", email: null },
  { id: "PL-100002", kind: "student", label: "Жақсыбеков Данияр (2 курс, ACTIVE)", roleHint: "STUDENT", email: null },
  { id: "PL-100003", kind: "student", label: "Құрманғалиева Әлия (4 курс, ACTIVE)", roleHint: "STUDENT", email: null },
  { id: "PL-100004", kind: "student", label: "Оспанов Тимур (ACADEMIC_LEAVE)", roleHint: "STUDENT", email: null },
  { id: "PL-100005", kind: "student", label: "Ахметова Мадина (GRADUATED)", roleHint: "STUDENT", email: null },
  { id: "staff-specialist", kind: "staff", label: "Test Specialist", roleHint: "SPECIALIST", email: "specialist@test.local" },
  { id: "staff-accountant", kind: "staff", label: "Test Accountant", roleHint: "ACCOUNTANT", email: "accountant@test.local" },
  { id: "staff-signer", kind: "staff", label: "Test Authorized Signer", roleHint: "AUTHORIZED_SIGNER", email: "signer@test.local" },
  { id: "staff-admin", kind: "staff", label: "Test System Admin", roleHint: "SYSTEM_ADMIN", email: "admin@test.local" },
];
