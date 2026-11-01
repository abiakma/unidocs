import { randomUUID } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, AuditService } from "../audit/audit.service.js";
import { type AuthContext, hasAnyRole, STAFF_ROLES } from "../common/auth-context.js";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";
import type {
  CertificatePurpose,
  CertificateType,
  DocumentLanguage,
  DocumentStatus,
} from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { SIGNING_PROVIDERS, type SignatureCheck, type SigningProviders } from "../signing/signing-provider.types.js";
import { StorageService } from "../storage/storage.service.js";
import {
  isEligibleForCertificate,
  STUDENT_DATA_PROVIDER,
  type StudentDataProvider,
} from "../students/student-data.types.js";
import { type AcademicSnapshot, parseAcademicSnapshot } from "./academic-snapshot.js";
import { type PdfMode, renderCertificatePdf } from "./pdf/certificate-pdf.js";
import { buildVerificationUrl } from "./pdf/qr-code.js";
import { computeVerificationStatus, isVerificationTokenFormat, type VerificationResult } from "./verification.js";

export interface DocumentSummary {
  id: string;
  requestId: string;
  documentNumber: string;
  certificateType: string;
  status: DocumentStatus;
  isTest: boolean;
  issuedAt: string | null;
  validUntil: string | null;
  revokedAt: string | null;
  verificationUrl: string | null;
}

export interface DownloadableFile {
  fileName: string;
  content: Buffer;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    @Inject(STUDENT_DATA_PROVIDER) private readonly students: StudentDataProvider,
    @Inject(SIGNING_PROVIDERS) private readonly signing: SigningProviders,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * After the last approval: read fresh academic data, assign the document number
   * and verification token, and render the unsigned preview for the signer.
   * Fails (and leaves the request APPROVED) when the student data source is unavailable.
   */
  async prepareForSigning(requestId: string, actorId: string, ipAddress: string | null): Promise<string> {
    const request = await this.prisma.certificateRequest.findUnique({
      where: { id: requestId },
      include: { student: true, document: true },
    });
    if (!request) throw new NotFoundException("Request not found");
    if (request.document) return request.document.id;
    if (request.status !== "APPROVED") throw new ConflictException("Only approved requests can be prepared");

    const profile = await this.students.getStudentById(request.student.externalUserId);
    if (!profile) throw new ConflictException("Student record no longer exists in the student registry");
    if (!isEligibleForCertificate(profile.educationStatus, request.certificateType)) {
      throw new ConflictException(`Student status ${profile.educationStatus} does not allow this certificate`);
    }

    const snapshot: AcademicSnapshot = { ...profile, capturedAt: new Date().toISOString(), source: this.students.source };
    const documentNumber = await this.nextDocumentNumber();
    const verificationToken = randomUUID();
    const now = new Date();

    const preview = await this.render("PREVIEW", {
      documentNumber,
      verificationToken,
      snapshot,
      request,
      issueDate: now,
      validUntil: new Date(now.getTime() + this.config.certificateValidityDays * DAY_MS),
      signer: null,
    });
    const filePath = await this.storage.savePdf("previews", preview);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.certificateRequest.updateMany({
        where: { id: requestId, status: "APPROVED" },
        data: { status: "AWAITING_SIGNATURE" },
      });
      if (updated.count !== 1) throw new ConflictException("Request changed while preparing the document");

      const document = await tx.document.create({
        data: {
          requestId,
          documentNumber,
          verificationToken,
          filePath,
          language: request.language,
          academicSnapshot: snapshot,
          status: "AWAITING_SIGNATURE",
        },
      });
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.DOCUMENT_PREPARED,
          entityType: "Document",
          entityId: document.id,
          metadata: { requestId, documentNumber },
          ipAddress,
        },
        tx,
      );
      return document.id;
    });
  }

  async sign(documentId: string, signer: AuthContext, clientSignature: string | null, ipAddress: string | null): Promise<DocumentSummary> {
    const provider = this.signing.active;
    if (this.config.nodeEnv === "production" && !provider.legallyValid) {
      throw new ForbiddenException("Test signing is not allowed in production");
    }

    const document = await this.prisma.document.findUnique({ where: { id: documentId }, include: { request: true } });
    if (!document) throw new NotFoundException("Document not found");
    if (document.status !== "AWAITING_SIGNATURE") throw new ConflictException("Document is not awaiting signature");

    const signerUser = await this.prisma.user.findUniqueOrThrow({ where: { id: signer.userId } });
    if (!signerUser.displayName || !signerUser.jobTitle) {
      throw new ConflictException("Signer profile needs a name and job title before signing");
    }

    const issuedAt = new Date();
    const validUntil = new Date(issuedAt.getTime() + this.config.certificateValidityDays * DAY_MS);
    const pdf = await this.render(provider.pdfMode, {
      documentNumber: document.documentNumber,
      verificationToken: document.verificationToken,
      snapshot: parseAcademicSnapshot(document.academicSnapshot),
      request: document.request,
      issueDate: issuedAt,
      validUntil,
      signer: { name: signerUser.displayName, jobTitle: signerUser.jobTitle },
    });

    const result = await provider.sign({
      documentId,
      documentNumber: document.documentNumber,
      pdf,
      signer: { userId: signer.userId, name: signerUser.displayName, jobTitle: signerUser.jobTitle },
      clientSignature,
    });
    if (this.config.nodeEnv === "production" && result.signatureStatus !== "VALID") {
      throw new ConflictException("The signature could not be validated");
    }
    const signedFilePath = await this.storage.savePdf("signed", result.signedPdf);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.updateMany({
        where: { id: documentId, status: "AWAITING_SIGNATURE" },
        data: {
          status: "ISSUED",
          isTest: result.signatureStatus === "MOCK_TEST_ONLY",
          issuedAt,
          validUntil,
        },
      });
      if (updated.count !== 1) throw new ConflictException("Document was already signed");

      await tx.documentSignature.create({
        data: {
          documentId,
          signerId: signer.userId,
          provider: provider.name,
          certificateSerial: result.certificateSerial,
          signedFilePath,
          signatureStatus: result.signatureStatus,
          verificationMetadata: result.metadata,
        },
      });
      await tx.certificateRequest.update({ where: { id: document.requestId }, data: { status: "ISSUED" } });
      await this.audit.log(
        {
          userId: signer.userId,
          action: AuditAction.DOCUMENT_SIGNED,
          entityType: "Document",
          entityId: documentId,
          metadata: { provider: provider.name, signatureStatus: result.signatureStatus },
          ipAddress,
        },
        tx,
      );
    });

    return this.getSummary(documentId);
  }

  async getSummary(documentId: string): Promise<DocumentSummary> {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      include: { request: { select: { certificateType: true } } },
    });
    return this.toSummary(document);
  }

  async listForStudent(studentUserId: string): Promise<DocumentSummary[]> {
    const documents = await this.prisma.document.findMany({
      where: { request: { studentUserId }, status: { in: ["ISSUED", "REVOKED"] } },
      include: { request: { select: { certificateType: true } } },
      orderBy: { issuedAt: "desc" },
    });
    return documents.map((document) => this.toSummary(document));
  }

  // Students get their own issued file; staff can open any document. Others get 404 (no existence leak).
  async getDownload(documentId: string, user: AuthContext, ipAddress: string | null): Promise<DownloadableFile> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { request: true, signatures: { orderBy: { signedAt: "desc" }, take: 1 } },
    });
    const isStaff = hasAnyRole(user, STAFF_ROLES);
    const isOwner = document?.request.studentUserId === user.userId;
    if (!document || (!isStaff && !isOwner)) throw new NotFoundException("Document not found");

    const signature = document.signatures[0];
    if (!isStaff && (document.status !== "ISSUED" || !signature)) throw new NotFoundException("Document not found");

    const content = await this.storage.read(signature ? signature.signedFilePath : document.filePath);
    await this.audit.log({
      userId: user.userId,
      action: AuditAction.DOCUMENT_DOWNLOADED,
      entityType: "Document",
      entityId: document.id,
      metadata: { asOwner: isOwner },
      ipAddress,
    });

    const suffix = signature ? "" : "-preview";
    return { fileName: `${document.documentNumber}${suffix}.pdf`, content };
  }

  async verify(token: string): Promise<VerificationResult> {
    const notFound: VerificationResult = { status: "NOT_FOUND", document: null };
    if (!isVerificationTokenFormat(token)) return notFound;

    const document = await this.prisma.document.findUnique({
      where: { verificationToken: token },
      include: {
        request: { select: { certificateType: true } },
        signatures: { orderBy: { signedAt: "desc" }, take: 1, include: { signer: { select: { jobTitle: true } } } },
      },
    });
    const signature = document?.signatures[0];
    if (!document || !signature) return notFound;

    const signatureCheck = await this.checkSignature(signature);
    const status = computeVerificationStatus({
      documentStatus: document.status,
      validUntil: document.validUntil,
      signatureCheck,
      now: new Date(),
    });

    return {
      status,
      document: {
        documentNumber: document.documentNumber,
        certificateType: document.request.certificateType,
        issuedAt: document.issuedAt?.toISOString() ?? null,
        validUntil: document.validUntil?.toISOString() ?? null,
        revokedAt: document.revokedAt?.toISOString() ?? null,
        signerDesignation: signature.signer.jobTitle,
        signatureCheck,
        isTestDocument: document.isTest,
      },
    };
  }

  async revoke(documentId: string, reason: string, actorId: string, ipAddress: string | null): Promise<DocumentSummary> {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.updateMany({
        where: { id: documentId, status: "ISSUED" },
        data: { status: "REVOKED", revokedAt: new Date(), revocationReason: reason, revokedById: actorId },
      });
      if (updated.count !== 1) throw new ConflictException("Only issued documents can be revoked");
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.DOCUMENT_REVOKED,
          entityType: "Document",
          entityId: documentId,
          metadata: { reason },
          ipAddress,
        },
        tx,
      );
    });
    return this.getSummary(documentId);
  }

  private async checkSignature(signature: {
    provider: string;
    signatureStatus: "MOCK_TEST_ONLY" | "VALID" | "INVALID";
    signedFilePath: string;
    certificateSerial: string | null;
  }): Promise<SignatureCheck> {
    const provider = this.signing.byName(signature.provider);
    if (!provider || signature.signatureStatus === "INVALID") return "NOT_VERIFIED";
    if (signature.signatureStatus === "MOCK_TEST_ONLY") return "TEST_ONLY";
    try {
      const signedPdf = await this.storage.read(signature.signedFilePath);
      return await provider.verify({
        signatureStatus: signature.signatureStatus,
        signedPdf,
        certificateSerial: signature.certificateSerial,
      });
    } catch {
      return "NOT_VERIFIED";
    }
  }

  private async nextDocumentNumber(): Promise<string> {
    const rows = await this.prisma.$queryRaw<{ value: bigint }[]>`SELECT nextval('document_number_seq') AS value`;
    const value = rows[0]?.value;
    if (value === undefined) throw new Error("Could not allocate a document number");
    return `AHEU-${new Date().getUTCFullYear()}-${value.toString().padStart(6, "0")}`;
  }

  private render(
    mode: PdfMode,
    data: {
      documentNumber: string;
      verificationToken: string;
      snapshot: AcademicSnapshot;
      request: {
        certificateType: CertificateType;
        purpose: CertificatePurpose;
        purposeDetails: string | null;
        language: DocumentLanguage;
      };
      issueDate: Date;
      validUntil: Date;
      signer: { name: string; jobTitle: string } | null;
    },
  ): Promise<Buffer> {
    return renderCertificatePdf({
      mode,
      language: data.request.language,
      documentNumber: data.documentNumber,
      certificateType: data.request.certificateType,
      purpose: data.request.purpose,
      purposeDetails: data.request.purposeDetails,
      student: data.snapshot,
      issueDate: data.issueDate,
      validUntil: data.validUntil,
      signer: data.signer,
      verificationUrl: buildVerificationUrl(this.config.verificationBaseUrl, data.verificationToken),
    });
  }

  private toSummary(document: {
    id: string;
    requestId: string;
    documentNumber: string;
    verificationToken: string;
    status: DocumentStatus;
    isTest: boolean;
    issuedAt: Date | null;
    validUntil: Date | null;
    revokedAt: Date | null;
    request: { certificateType: string };
  }): DocumentSummary {
    return {
      id: document.id,
      requestId: document.requestId,
      documentNumber: document.documentNumber,
      certificateType: document.request.certificateType,
      status: document.status,
      isTest: document.isTest,
      issuedAt: document.issuedAt?.toISOString() ?? null,
      validUntil: document.validUntil?.toISOString() ?? null,
      revokedAt: document.revokedAt?.toISOString() ?? null,
      verificationUrl:
        document.status === "AWAITING_SIGNATURE"
          ? null
          : buildVerificationUrl(this.config.verificationBaseUrl, document.verificationToken),
    };
  }
}
