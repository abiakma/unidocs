import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditAction, AuditService } from "../audit/audit.service.js";
import { CertificateType } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { DEFAULT_WORKFLOW, validateWorkflowSteps, type WorkflowStepSnapshot } from "./workflow-rules.js";

export interface WorkflowConfiguration {
  defaultSteps: WorkflowStepSnapshot[];
  overrides: Partial<Record<CertificateType, WorkflowStepSnapshot[]>>;
}

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Steps used for a new request of this type: type-specific chain, else the default chain.
  async getStepsFor(certificateType: CertificateType): Promise<WorkflowStepSnapshot[]> {
    const rows = await this.prisma.workflowStep.findMany({
      where: { OR: [{ certificateType }, { certificateType: null }] },
      orderBy: { stepOrder: "asc" },
    });
    const specific = rows.filter((row) => row.certificateType === certificateType);
    const chosen = specific.length > 0 ? specific : rows.filter((row) => row.certificateType === null);
    if (chosen.length === 0) return [...DEFAULT_WORKFLOW];
    return chosen.map((row) => ({ role: row.role, name: row.name }));
  }

  async getConfiguration(): Promise<WorkflowConfiguration> {
    const rows = await this.prisma.workflowStep.findMany({ orderBy: { stepOrder: "asc" } });
    const configuration: WorkflowConfiguration = { defaultSteps: [], overrides: {} };

    for (const row of rows) {
      const step = { role: row.role, name: row.name };
      if (row.certificateType === null) {
        configuration.defaultSteps.push(step);
      } else {
        (configuration.overrides[row.certificateType] ??= []).push(step);
      }
    }
    if (configuration.defaultSteps.length === 0) configuration.defaultSteps = [...DEFAULT_WORKFLOW];
    return configuration;
  }

  /**
   * Replaces the chain for one certificate type (or the default chain when type is null).
   * An empty list for a certificate type removes its override. Requests already
   * submitted keep the chain they were created with.
   */
  async replaceSteps(
    certificateType: CertificateType | null,
    steps: WorkflowStepSnapshot[],
    actorId: string,
    ipAddress: string | null,
  ): Promise<void> {
    const removingOverride = certificateType !== null && steps.length === 0;
    if (!removingOverride) {
      const problem = validateWorkflowSteps(steps);
      if (problem) throw new BadRequestException(problem);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowStep.deleteMany({ where: { certificateType } });
      await tx.workflowStep.createMany({
        data: steps.map((step, index) => ({ certificateType, stepOrder: index, role: step.role, name: step.name })),
      });
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.WORKFLOW_UPDATED,
          entityType: "WorkflowStep",
          entityId: certificateType ?? "DEFAULT",
          metadata: { steps: steps.map((step) => ({ role: step.role, name: step.name })) },
          ipAddress,
        },
        tx,
      );
    });
  }
}
