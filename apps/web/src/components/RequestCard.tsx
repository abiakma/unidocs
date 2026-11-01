import type { ReactNode } from "react";
import { Link } from "react-router";
import type { RequestView } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { RequestStatusBadge } from "./StatusBadge";
import { WorkflowProgress } from "./WorkflowProgress";

const ACCENT: Partial<Record<RequestView["status"], string>> = {
  ISSUED: "border-l-success",
  REJECTED: "border-l-danger",
};

// One card for students and staff. Staff cards also show the student's name.
export function RequestCard({ request, href, actions }: { request: RequestView; href: string; actions?: ReactNode }) {
  const { t, formatDate } = useI18n();
  const titleId = `request-${request.id}-title`;
  const purpose = t(`purpose.${request.purpose}`) + (request.purposeDetails ? ` (${request.purposeDetails})` : "");

  return (
    <article
      className={`rounded-[10px] border border-l-4 border-line p-4 ${ACCENT[request.status] ?? "border-l-brand"}`}
      aria-labelledby={titleId}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="m-0 text-base font-semibold">
          <Link to={href} className="text-ink hover:text-brand hover:underline">
            {t(`certType.${request.certificateType}`)}
          </Link>
        </h3>
        <RequestStatusBadge status={request.status} />
      </div>

      <p className="mt-0 mb-3 text-sm text-muted">
        {request.student && `${request.student.fullName ?? request.student.externalStudentId} · `}
        {t("requests.purpose", { purpose })} · {t("requests.submittedOn", { date: formatDate(request.createdAt) })}
      </p>

      <WorkflowProgress request={request} />

      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
