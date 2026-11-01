import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { type AppRequest, type AuthContext, clientIp } from "../common/auth-context.js";
import { CurrentUser, Roles } from "../common/decorators.js";
import { CreateRequestDto } from "./dto/request.dto.js";
import type { RequestView } from "./request-view.js";
import { RequestsService } from "./requests.service.js";

@ApiTags("requests")
@ApiCookieAuth()
@Controller("requests")
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @Roles("STUDENT")
  @ApiOperation({ summary: "Submit a certificate request" })
  @ApiCreatedResponse({ description: "Created request with its workflow" })
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: AuthContext, @Req() request: AppRequest): Promise<RequestView> {
    return this.requests.create(user, dto, clientIp(request));
  }

  @Get("my")
  @Roles("STUDENT")
  @ApiOperation({ summary: "Requests of the signed-in student" })
  my(@CurrentUser() user: AuthContext): Promise<RequestView[]> {
    return this.requests.listMine(user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Request details (owner student or staff)" })
  get(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @CurrentUser() user: AuthContext): Promise<RequestView> {
    return this.requests.getForUser(id, user);
  }
}
