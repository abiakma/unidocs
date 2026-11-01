import type { RequestView } from "../api/types";
import { stepLabel, useI18n } from "../i18n/I18nProvider";

export function ApprovalHistory({ request }: { request: RequestView }) {
  const { t, formatDate } = useI18n();

  return (
    <section className="panel" aria-labelledby="approvals-title">
      <h2 id="approvals-title" className="mt-0 mb-3 text-lg font-bold">
        {t("details.approvals")}
      </h2>
      {request.approvals.length === 0 ? (
        <p className="m-0 text-muted">{t("details.noApprovals")}</p>
      ) : (
        <ol className="m-0 space-y-3 pl-5">
          {request.approvals.map((approval) => {
            const step = request.steps[approval.stepIndex];
            return (
              <li key={approval.stepIndex}>
                <p className="m-0">
                  <span className="font-semibold">{step ? stepLabel(t, step.name) : t(`role.${approval.stepRole}`)}</span>
                  {" — "}
                  {approval.approverName ?? t(`role.${approval.stepRole}`)}{" "}
                  <span className={approval.decision === "APPROVED" ? "text-success" : "text-danger"}>
                    {t(`details.decision.${approval.decision}`)}
                  </span>
                  <span className="text-muted"> · {formatDate(approval.createdAt)}</span>
                </p>
                {approval.comment && <p className="mt-1 mb-0 text-muted">“{approval.comment}”</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
