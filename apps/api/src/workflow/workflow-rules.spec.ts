import { describe, expect, it } from "vitest";
import {
  checkCanDecide,
  DEFAULT_WORKFLOW,
  parseWorkflowSnapshot,
  stateAfterApproval,
  validateWorkflowSteps,
  type WorkflowRequestState,
} from "./workflow-rules.js";

const pending: WorkflowRequestState = {
  status: "PENDING",
  currentStepIndex: 0,
  studentUserId: "student-1",
  steps: DEFAULT_WORKFLOW,
};

describe("checkCanDecide", () => {
  it("allows the role that owns the current step", () => {
    const result = checkCanDecide(pending, { userId: "spec-1", roles: ["SPECIALIST"] }, []);
    expect(result).toEqual({ allowed: true, step: DEFAULT_WORKFLOW[0] });
  });

  it("rejects a role that owns a later step (unauthorized approval)", () => {
    const result = checkCanDecide(pending, { userId: "acc-1", roles: ["ACCOUNTANT"] }, []);
    expect(result).toEqual({ allowed: false, reason: "WRONG_ROLE" });
  });

  it("rejects a system admin, who is not part of the chain", () => {
    const result = checkCanDecide(pending, { userId: "admin-1", roles: ["SYSTEM_ADMIN"] }, []);
    expect(result).toEqual({ allowed: false, reason: "WRONG_ROLE" });
  });

  it("enforces separation of duties across steps", () => {
    const atStep2 = { ...pending, status: "UNDER_REVIEW" as const, currentStepIndex: 1 };
    const result = checkCanDecide(atStep2, { userId: "multi-1", roles: ["SPECIALIST", "ACCOUNTANT"] }, ["multi-1"]);
    expect(result).toEqual({ allowed: false, reason: "ALREADY_DECIDED_BY_USER" });
  });

  it("does not let anyone act on their own request", () => {
    const result = checkCanDecide(pending, { userId: "student-1", roles: ["SPECIALIST"] }, []);
    expect(result).toEqual({ allowed: false, reason: "OWN_REQUEST" });
  });

  it.each(["APPROVED", "REJECTED", "AWAITING_SIGNATURE", "ISSUED"] as const)("blocks decisions when status is %s", (status) => {
    const result = checkCanDecide({ ...pending, status }, { userId: "spec-1", roles: ["SPECIALIST"] }, []);
    expect(result).toEqual({ allowed: false, reason: "NOT_ACTIONABLE" });
  });
});

describe("stateAfterApproval", () => {
  it("moves to the next step and marks the request under review", () => {
    expect(stateAfterApproval(DEFAULT_WORKFLOW, 0)).toEqual({ status: "UNDER_REVIEW", currentStepIndex: 1 });
  });

  it("marks the request approved after the last step", () => {
    expect(stateAfterApproval(DEFAULT_WORKFLOW, 2)).toEqual({ status: "APPROVED", currentStepIndex: 3 });
  });
});

describe("validateWorkflowSteps", () => {
  it("accepts the default workflow", () => {
    expect(validateWorkflowSteps(DEFAULT_WORKFLOW)).toBeNull();
  });

  it("requires the authorized signer as the last step", () => {
    expect(validateWorkflowSteps([{ role: "SPECIALIST", name: "X" }])).toMatch(/last step/);
  });

  it("refuses SYSTEM_ADMIN and STUDENT steps", () => {
    expect(validateWorkflowSteps([{ role: "SYSTEM_ADMIN", name: "X" }, { role: "AUTHORIZED_SIGNER", name: "Y" }])).toMatch(/roles/);
    expect(validateWorkflowSteps([{ role: "STUDENT", name: "X" }, { role: "AUTHORIZED_SIGNER", name: "Y" }])).toMatch(/roles/);
  });

  it("refuses an empty workflow", () => {
    expect(validateWorkflowSteps([])).toMatch(/at least one/);
  });
});

describe("parseWorkflowSnapshot", () => {
  it("rejects malformed snapshots", () => {
    expect(() => parseWorkflowSnapshot({})).toThrow();
    expect(() => parseWorkflowSnapshot([{ role: "SYSTEM_ADMIN", name: "x" }])).toThrow();
  });
});
