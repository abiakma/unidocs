import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsBase64, IsOptional, MaxLength } from "class-validator";
import type { Response } from "express";
import { type AppRequest, type AuthContext, clientIp } from "../common/auth-context.js";
import { CurrentUser, Public, Roles } from "../common/decorators.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { SIGNING_PROVIDERS, type SigningProviders } from "../signing/signing-provider.types.js";
import { parseAcademicSnapshot } from "./academic-snapshot.js";
import { type DocumentSummary, DocumentsService } from "./documents.service.js";
import type { VerificationResult } from "./verification.js";

export class SignDocumentDto {
  @ApiPropertyOptional({
    description: "Signature created on the signer's computer (e.g. NCALayer CMS), base64. Not used by the mock provider.",
  })
  @IsOptional()
  @IsBase64()
  @MaxLength(200_000)
  clientSignature?: string;
}

export class SigningQueueItem {
  @ApiProperty() documentId!: string;
  @ApiProperty() requestId!: string;
  @ApiProperty() documentNumber!: string;
  @ApiProperty() certificateType!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() language!: string;
  @ApiProperty() preparedAt!: string;
}

export interface SigningQueue {
  // Lets the UI warn that signatures are TEST / NOT LEGALLY SIGNED.
  signing: { provider: string; legallyValid: boolean };
  awaitingSignature: SigningQueueItem[];
  awaitingPreparation: { requestId: string; certificateType: string; approvedAt: string }[];
}

@ApiTags("documents")
@Controller("documents")
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly prisma: PrismaService,
    @Inject(SIGNING_PROVIDERS) private readonly signing: SigningProviders,
  ) {}

  @Get("my")
  @Roles("STUDENT")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Issued and revoked certificates of the signed-in student" })
  my(@CurrentUser() user: AuthContext): Promise<DocumentSummary[]> {
    return this.documents.listForStudent(user.userId);
  }

  @Get("signing-queue")
  @Roles("AUTHORIZED_SIGNER")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Documents awaiting signature and approved requests whose document could not be prepared yet" })
  async signingQueue(): Promise<SigningQueue> {
    const [documents, unprepared] = await Promise.all([
      this.prisma.document.findMany({
        where: { status: "AWAITING_SIGNATURE" },
        include: { request: { select: { certificateType: true } } },
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
      this.prisma.certificateRequest.findMany({
        where: { status: "APPROVED", document: null },
        orderBy: { updatedAt: "asc" },
        take: 200,
      }),
    ]);

    return {
      signing: { provider: this.signing.active.name, legallyValid: this.signing.active.legallyValid },
      awaitingSignature: documents.map((document) => ({
        documentId: document.id,
        requestId: document.requestId,
        documentNumber: document.documentNumber,
        certificateType: document.request.certificateType,
        studentName: parseAcademicSnapshot(document.academicSnapshot).fullName,
        language: document.language,
        preparedAt: document.createdAt.toISOString(),
      })),
      awaitingPreparation: unprepared.map((request) => ({
        requestId: request.id,
        certificateType: request.certificateType,
        approvedAt: request.updatedAt.toISOString(),
      })),
    };
  }

  @Post("requests/:requestId/prepare")
  @Roles("AUTHORIZED_SIGNER", "SYSTEM_ADMIN")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Retry preparing the PDF for an approved request (e.g. after Platonus was unavailable)" })
  async prepare(
    @Param("requestId", new ParseUUIDPipe({ version: "4" })) requestId: string,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<DocumentSummary> {
    const documentId = await this.documents.prepareForSigning(requestId, user.userId, clientIp(request));
    return this.documents.getSummary(documentId);
  }

  @Get(":id/download")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Download a certificate PDF (owner student, or staff for review)" })
  @ApiOkResponse({ description: "PDF file" })
  async download(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Query("inline") inline: string | undefined,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.getDownload(id, user, clientIp(request));
    response.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(file.content, {
      type: "application/pdf",
      disposition: `${inline === "1" ? "inline" : "attachment"}; filename="${file.fileName}"`,
      length: file.content.length,
    });
  }

  @Post(":id/sign")
  @HttpCode(200)
  @Roles("AUTHORIZED_SIGNER")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Sign a document awaiting signature with the configured signing provider" })
  sign(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: SignDocumentDto,
    @CurrentUser() user: AuthContext,
    @Req() request: AppRequest,
  ): Promise<DocumentSummary> {
    return this.documents.sign(id, user, body.clientSignature ?? null, clientIp(request));
  }

  @Get("verify/:token")
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Public certificate verification by QR token. Returns no student personal data." })
  verify(@Param("token") token: string): Promise<VerificationResult> {
    return this.documents.verify(token.slice(0, 64));
  }
}
