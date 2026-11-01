import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  StudentAcademicProfile,
  StudentAcademicStatus,
  StudentDataProvider,
  StudentIdentity,
} from "../student-data.types.js";
import { MOCK_STUDENTS } from "./mock-students.js";

// Development provider backed by fictional in-memory students. No network access.
@Injectable()
export class MockStudentDataProvider implements StudentDataProvider {
  readonly source = "mock" as const;

  async getStudentById(externalStudentId: string): Promise<StudentAcademicProfile | null> {
    const student = MOCK_STUDENTS.find((item) => item.externalStudentId === externalStudentId);
    return student ? structuredClone(student) : null;
  }

  async getCurrentStudent(identity: StudentIdentity): Promise<StudentAcademicProfile> {
    const student = await this.getStudentById(identity.externalStudentId);
    if (!student) throw new NotFoundException("Student record not found");
    return student;
  }

  async getStudentAcademicStatus(externalStudentId: string): Promise<StudentAcademicStatus | null> {
    const student = await this.getStudentById(externalStudentId);
    if (!student) return null;
    return {
      externalStudentId,
      educationStatus: student.educationStatus,
      checkedAt: new Date().toISOString(),
      source: this.source,
    };
  }
}
