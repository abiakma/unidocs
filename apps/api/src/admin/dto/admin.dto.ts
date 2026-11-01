import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { CertificateType, RequestStatus, RoleName } from "../../generated/prisma/enums.js";
import { APPROVER_ROLES, MAX_WORKFLOW_STEPS } from "../../workflow/workflow-rules.js";

const PLAIN_TEXT = /^[^\p{Cc}]*$/u;

function trim({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export const STAFF_ROLE_NAMES = ["SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER", "SYSTEM_ADMIN"] as const;

export class UpdateRolesDto {
  @ApiProperty({ enum: STAFF_ROLE_NAMES, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsIn(STAFF_ROLE_NAMES, { each: true })
  roles!: RoleName[];
}

export class UpdateStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class CreateStaffUserDto {
  @ApiProperty({ description: "ID in the university staff identity provider" })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._@-]+$/, { message: "externalUserId may contain letters, digits and . _ @ -" })
  externalUserId!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Matches(PLAIN_TEXT)
  displayName!: string;

  @ApiProperty({ description: "Printed under the signature, e.g. Vice-Rector for Academic Affairs" })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Matches(PLAIN_TEXT)
  jobTitle!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiProperty({ enum: STAFF_ROLE_NAMES, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsIn(STAFF_ROLE_NAMES, { each: true })
  roles!: RoleName[];
}

export class WorkflowStepDto {
  @ApiProperty({ enum: APPROVER_ROLES })
  @IsIn(APPROVER_ROLES)
  role!: RoleName;

  @ApiProperty({ description: "Step name or translation key" })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(PLAIN_TEXT)
  name!: string;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ enum: CertificateType, nullable: true, description: "Omit or null for the default chain" })
  @IsOptional()
  @IsEnum(CertificateType)
  certificateType?: CertificateType | null;

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ArrayMaxSize(MAX_WORKFLOW_STEPS)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
}

export class RevokeDocumentDto {
  @ApiProperty({ minLength: 5, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  @Matches(PLAIN_TEXT)
  reason!: string;
}

export class UsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;
}

export class AuditLogsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityType?: string;
}

export class RequestsQueryDto {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}
