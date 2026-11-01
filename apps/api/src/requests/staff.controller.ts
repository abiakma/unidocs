import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { type AppRequest, type AuthContext, clientIp } from "../common/auth-context.js";
import { CurrentUser, Roles } from "../common/decorators.js";
import {
  STUDENT_DATA_PROVIDER,
  type StudentAcademicProfile,
  type StudentDataProvider,
} from "../students/student-data.types.js";
import { ApproveRequestDto, RejectRequestDto } from "./dto/request.dto.js";
import type { RequestView, StaffRequestView } from "./request-view.js";
import { RequestsService } from "./requests.service.js";

export interface StaffRequestDetails {
  request: RequestView | StaffRequestView;
  academicProfile: StudentAcademicProfile | null;
  academicProfileError: string | null;
}

@ApiTags("staff")
@ApiCookieAuth()
@Roles("SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER")
@Controller("staff/requests")
export class StaffController {
  constructor(
    private readonly requests: RequestsService,
    @Inject(STUDENT_DATA_PROVIDER) private readonly students: StudentDataProvider,
  ) {}

  @Get()
  @ApiOperation({ summary: "Requests whose current workflow step belongs to one of my roles" })
  list(@CurrentUser() user: AuthContext): Promise<StaffRequestView[]> {
    return this.requests.listActionable(user);
  }

  @Get(":id")
  // Read-only view; administrators can open it from the requests overview.
  @Roles("SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER", "SYSTEM_ADMIN")
  @ApiOperation({ summary: "Request details with the student's live academic profile" })
  async details(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthContext,
  ): Promise<StaffRequestDetails> {
    const request = await this.requests.getForUser(id, user);
    const externalId = "student" in request ? request.student.externalStudentId : null;
    if (!externalId) return { request, academicProfile: null, academicProfileError: null };

    try {
      return { request, academicProfile: await this.students.getStudentById(externalId), academicProfileError: null };
    } catch {
      return { request, academicProfile: null, academicProfileError: "Student data source is unavailable" };
    }
  }

  @Post(":id/approve")
  @HttpCode(200)
  @ApiOperation({ summary: "Approve the current workflow step" })
  approve(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: ApproveRequestDto,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<RequestView> {
    return this.requests.approve(id, user, body.comment || null, clientIp(request));
  }

  @Post(":id/reject")
  @HttpCode(200)
  @ApiOperation({ summary: "Reject the request at the current workflow step" })
  reject(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: RejectRequestDto,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<RequestView> {
    return this.requests.reject(id, user, body.comment, clientIp(request));
  }
}
