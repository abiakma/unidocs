import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { CertificatePurpose, CertificateType, DocumentLanguage } from "../../generated/prisma/enums.js";

// Printable text only: no control characters.
const PLAIN_TEXT = /^[^\p{Cc}]*$/u;

function trim({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateRequestDto {
  @ApiProperty({ enum: CertificateType })
  @IsEnum(CertificateType)
  certificateType!: CertificateType;

  @ApiProperty({ enum: CertificatePurpose })
  @IsEnum(CertificatePurpose)
  purpose!: CertificatePurpose;

  @ApiPropertyOptional({ maxLength: 200, description: "Where the certificate will be submitted" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  @Matches(PLAIN_TEXT, { message: "purposeDetails contains invalid characters" })
  purposeDetails?: string;

  @ApiPropertyOptional({ enum: DocumentLanguage, default: DocumentLanguage.KK })
  @IsOptional()
  @IsEnum(DocumentLanguage)
  language?: DocumentLanguage;
}

export class ApproveRequestDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  @Matches(/^[^\p{Cc}]*$/u, { message: "comment contains invalid characters" })
  comment?: string;
}

export class RejectRequestDto {
  @ApiProperty({ minLength: 3, maxLength: 1000, description: "Reason shown to the student" })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  @Matches(/^[^\p{Cc}]*$/u, { message: "comment contains invalid characters" })
  comment!: string;
}
