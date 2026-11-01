import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { type AppRequest, type AuthContext, clientIp } from "../common/auth-context.js";
import { CurrentUser, Roles } from "../common/decorators.js";
import { type DocumentSummary, DocumentsService } from "../documents/documents.service.js";
import type { StaffRequestView } from "../requests/request-view.js";
import { RequestsService } from "../requests/requests.service.js";
import { type WorkflowConfiguration, WorkflowService } from "../workflow/workflow.service.js";
import { type AdminUserView, AdminService, type AuditLogView, type Page } from "./admin.service.js";
import {
  AuditLogsQueryDto,
  CreateStaffUserDto,
  RequestsQueryDto,
  RevokeDocumentDto,
  UpdateRolesDto,
  UpdateStatusDto,
  UpdateWorkflowDto,
  UsersQueryDto,
} from "./dto/admin.dto.js";

@ApiTags("admin")
@ApiCookieAuth()
@Roles("SYSTEM_ADMIN")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly workflow: WorkflowService,
    private readonly requests: RequestsService,
    private readonly documents: DocumentsService,
  ) {}

  @Get("users")
  @ApiOperation({ summary: "List users" })
  users(@Query() query: UsersQueryDto): Promise<AdminUserView[]> {
    return this.admin.listUsers(query);
  }

  @Post("users")
  @ApiOperation({ summary: "Provision a staff account" })
  createUser(@Body() dto: CreateStaffUserDto, @CurrentUser() user: AuthContext, @Req() request: AppRequest): Promise<AdminUserView> {
    return this.admin.createStaffUser(dto, user.userId, clientIp(request));
  }

  @Patch("users/:id/roles")
  @ApiOperation({ summary: "Replace a staff user's roles (never your own)" })
  updateRoles(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateRolesDto,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<AdminUserView> {
    return this.admin.updateRoles(id, dto.roles, user.userId, clientIp(request));
  }

  @Patch("users/:id/status")
  @ApiOperation({ summary: "Activate or deactivate a user (never yourself)" })
  updateStatus(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<AdminUserView> {
    return this.admin.updateStatus(id, dto.isActive, user.userId, clientIp(request));
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Audit log, newest first" })
  auditLogs(@Query() query: AuditLogsQueryDto): Promise<Page<AuditLogView>> {
    return this.admin.listAuditLogs(query);
  }

  @Get("workflow")
  @ApiOperation({ summary: "Approval workflow configuration" })
  getWorkflow(): Promise<WorkflowConfiguration> {
    return this.workflow.getConfiguration();
  }

  @Put("workflow")
  @ApiOperation({ summary: "Replace the default chain or a certificate-type chain (empty list removes an override)" })
  async updateWorkflow(
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<WorkflowConfiguration> {
    await this.workflow.replaceSteps(dto.certificateType ?? null, dto.steps, user.userId, clientIp(request));
    return this.workflow.getConfiguration();
  }

  @Get("requests")
  @ApiOperation({ summary: "Overview of all certificate requests" })
  allRequests(@Query() query: RequestsQueryDto): Promise<StaffRequestView[]> {
    return this.requests.listAll(query.status);
  }

  @Post("documents/:id/revoke")
  @HttpCode(200)
  @ApiOperation({ summary: "Revoke an issued certificate (manual administrator decision)" })
  revoke(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: RevokeDocumentDto,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<DocumentSummary> {
    return this.documents.revoke(id, dto.reason, user.userId, clientIp(request));
  }

  @Get("config")
  @ApiOperation({ summary: "Non-secret system configuration" })
  config(): Record<string, string | number | boolean> {
    return this.admin.systemConfiguration();
  }
}
