import { Controller, Get, Inject } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../common/auth-context.js";
import { CurrentUser, Roles } from "../common/decorators.js";
import {
  STUDENT_DATA_PROVIDER,
  type StudentAcademicProfile,
  type StudentDataProvider,
} from "./student-data.types.js";

@ApiTags("students")
@ApiCookieAuth()
@Controller("students")
export class StudentsController {
  constructor(@Inject(STUDENT_DATA_PROVIDER) private readonly students: StudentDataProvider) {}

  @Get("me")
  @Roles("STUDENT")
  @ApiOperation({ summary: "Academic profile of the signed-in student (live from the student data provider)" })
  @ApiOkResponse({ description: "Student academic profile" })
  async me(@CurrentUser() user: AuthContext): Promise<StudentAcademicProfile> {
    return this.students.getCurrentStudent({ externalStudentId: user.externalUserId });
  }
}
