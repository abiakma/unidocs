import { Link, useParams } from "react-router";
import { documentDownloadUrl } from "../../api/client";
import { requestsApi } from "../../api/endpoints";
import { ApprovalHistory } from "../../components/ApprovalHistory";
import { PageSkeleton } from "../../components/Skeleton";
import { ErrorState, PageHeader } from "../../components/States";
import { DocumentStatusBadge, RequestStatusBadge, TestBadge } from "../../components/StatusBadge";
import { WorkflowProgress } from "../../components/WorkflowProgress";
import { LIVE_REFRESH, useApi } from "../../hooks/useApi";
import { useI18n } from "../../i18n/I18nProvider";

export function RequestDetailsPage() {
  const { t, formatDate } = useI18n();
  const { requestId = "" } = useParams();
  const { data: request, error, loading, reload } = useApi((signal) => requestsApi.get(requestId, signal), [requestId], LIVE_REFRESH);

  if (loading) return <PageSkeleton />;
  if (error !== null || !request) return <ErrorState error={error} onRetry={reload} />;

  const rejection = request.approvals.find((approval) => approval.decision === "REJECTED");
  const document = request.document;

  return (
    <div className="space-y-6">
      <Link to="/student/requests" className="text-brand">
        ← {t("common.back")}
      </Link>
      <PageHeader title={t(`certType.${request.certificateType}`)} subtitle={t("requests.submittedOn", { date: formatDate(request.createdAt) })} />

      <section className="panel space-y-4" aria-label={t("requests.progress")}>
        <div className="flex flex-wrap items-center gap-3">
          <RequestStatusBadge status={request.status} />
          <span className="text-muted">
            {t("requests.purpose", {
              purpose: t(`purpose.${request.purpose}`) + (request.purposeDetails ? ` (${request.purposeDetails})` : ""),
            })}
            {" · "}
            {t(`docLanguage.${request.language}`)}
          </span>
        </div>
        <WorkflowProgress request={request} />
        {rejection?.comment && (
          <p className="m-0 rounded-md bg-red-50 px-4 py-3 text-danger" role="alert">
            {t("details.rejected", { reason: rejection.comment })}
          </p>
        )}
      </section>

      {document && document.status !== "AWAITING_SIGNATURE" && (
        <section className="panel flex flex-wrap items-center justify-between gap-3" aria-label={t("details.document")}>
          <div className="space-y-1">
            <p className="m-0 font-semibold">
              {t("details.documentNumber")}: <span className="font-mono">{document.documentNumber}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <DocumentStatusBadge status={document.status} />
              {document.isTest && <TestBadge />}
            </div>
          </div>
          {document.status === "ISSUED" && (
            <a href={documentDownloadUrl(document.id)} className="btn btn-primary">
              {t("common.download")}
            </a>
          )}
        </section>
      )}

      <ApprovalHistory request={request} />
    </div>
  );
}
