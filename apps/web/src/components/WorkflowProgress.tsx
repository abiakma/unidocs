import type { RequestView } from "../api/types";
import { stepLabel, useI18n } from "../i18n/I18nProvider";

type StepState = "done" | "current" | "rejected" | "todo";

// Visible steps: Submitted → configured approval steps → Signing → Issued.
export function progressSteps(request: Pick<RequestView, "status" | "currentStepIndex" | "steps">): StepState[] {
  const approvalCount = request.steps.length;
  const total = approvalCount + 3;
  // Position of the step that is currently happening (0 = submitted).
  let current: number;
  switch (request.status) {
    case "PENDING":
    case "UNDER_REVIEW":
    case "REJECTED":
      current = request.currentStepIndex + 1;
      break;
    case "APPROVED":
    case "AWAITING_SIGNATURE":
      current = approvalCount + 1;
      break;
    case "ISSUED":
      current = total;
      break;
  }

  return Array.from({ length: total }, (_, index): StepState => {
    if (index < current) return "done";
    if (index === current) return request.status === "REJECTED" ? "rejected" : "current";
    return "todo";
  });
}

export function WorkflowProgress({ request }: { request: RequestView }) {
  const { t } = useI18n();
  const labels = [
    t("step.submitted"),
    ...request.steps.map((step) => stepLabel(t, step.name)),
    t("step.signing"),
    t("step.issued"),
  ];
  const states = progressSteps(request);

  return (
    <ol className="progress" aria-label={t("requests.progress")}>
      {labels.map((label, index) => {
        const state = states[index] ?? "todo";
        const className = state === "todo" ? "progress-step" : `progress-step is-${state}`;
        return (
          <li key={`${index}-${label}`} className={className} aria-current={state === "current" ? "step" : undefined}>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
