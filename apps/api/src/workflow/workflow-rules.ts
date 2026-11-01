import type { RequestStatus, RoleName } from "../generated/prisma/enums.js";

export interface WorkflowStepSnapshot {
  role: RoleName;
  // Translation key (e.g. ENROLLMENT_VERIFICATION) or a custom name set by an administrator.
  name: string;
}

export const APPROVER_ROLES: readonly RoleName[] = ["SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER"];
export const MAX_WORKFLOW_STEPS = 6;

// Default chain. The university can change it in the admin dashboard.
export const DEFAULT_WORKFLOW: readonly WorkflowStepSnapshot[] = [
  { role: "SPECIALIST", name: "ENROLLMENT_VERIFICATION" },
  { role: "ACCOUNTANT", name: "FINANCIAL_CHECK" },
  { role: "AUTHORIZED_SIGNER", name: "FINAL_APPROVAL" },
];

export const OPEN_STATUSES: readonly RequestStatus[] = ["PENDING", "UNDER_REVIEW"];

export interface WorkflowRequestState {
  status: RequestStatus;
  currentStepIndex: number;
  studentUserId: string;
  steps: readonly WorkflowStepSnapshot[];
}

export interface WorkflowActor {
  userId: string;
  roles: readonly RoleName[];
}

export type DecisionDeniedReason = "NOT_ACTIONABLE" | "WRONG_ROLE" | "OWN_REQUEST" | "ALREADY_DECIDED_BY_USER";

export type DecisionCheck =
  | { allowed: true; step: WorkflowStepSnapshot }
  | { allowed: false; reason: DecisionDeniedReason };

export function validateWorkflowSteps(steps: readonly WorkflowStepSnapshot[]): string | null {
  if (steps.length === 0) return "The workflow needs at least one step";
  if (steps.length > MAX_WORKFLOW_STEPS) return `The workflow can have at most ${MAX_WORKFLOW_STEPS} steps`;
  if (steps.some((step) => !APPROVER_ROLES.includes(step.role))) {
    return `Workflow steps can only use roles: ${APPROVER_ROLES.join(", ")}`;
  }
  if (steps.at(-1)?.role !== "AUTHORIZED_SIGNER") return "The last step must be the authorized signer's final approval";
  return null;
}

export function parseWorkflowSnapshot(value: unknown): WorkflowStepSnapshot[] {
  if (!Array.isArray(value)) throw new Error("Invalid workflow snapshot");
  return value.map((item: unknown) => {
    if (typeof item !== "object" || item === null) throw new Error("Invalid workflow step");
    const { role, name } = item as Record<string, unknown>;
    if (typeof role !== "string" || !APPROVER_ROLES.includes(role as RoleName) || typeof name !== "string") {
      throw new Error("Invalid workflow step");
    }
    return { role: role as RoleName, name };
  });
}

// Can this staff member decide the current step of this request?
export function checkCanDecide(
  request: WorkflowRequestState,
  actor: WorkflowActor,
  previousApproverIds: readonly string[],
): DecisionCheck {
  const step = request.steps[request.currentStepIndex];
  if (!OPEN_STATUSES.includes(request.status) || !step) return { allowed: false, reason: "NOT_ACTIONABLE" };
  if (request.studentUserId === actor.userId) return { allowed: false, reason: "OWN_REQUEST" };
  if (!actor.roles.includes(step.role)) return { allowed: false, reason: "WRONG_ROLE" };
  // Separation of duties: one person cannot approve two steps of the same request.
  if (previousApproverIds.includes(actor.userId)) return { allowed: false, reason: "ALREADY_DECIDED_BY_USER" };
  return { allowed: true, step };
}

export function stateAfterApproval(
  steps: readonly WorkflowStepSnapshot[],
  currentStepIndex: number,
): { status: RequestStatus; currentStepIndex: number } {
  const nextIndex = currentStepIndex + 1;
  if (nextIndex >= steps.length) return { status: "APPROVED", currentStepIndex: steps.length };
  return { status: "UNDER_REVIEW", currentStepIndex: nextIndex };
}
