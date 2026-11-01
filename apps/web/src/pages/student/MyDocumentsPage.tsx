import { Link } from "react-router";
import { documentDownloadUrl } from "../../api/client";
import { documentsApi } from "../../api/endpoints";
import { PageSkeleton } from "../../components/Skeleton";
import { EmptyState, ErrorState, PageHeader } from "../../components/States";
import { DocumentStatusBadge, TestBadge } from "../../components/StatusBadge";
import { useApi } from "../../hooks/useApi";
import { useI18n } from "../../i18n/I18nProvider";

export function MyDocumentsPage() {
  const { t, formatDate } = useI18n();
  const { data, error, loading, reload } = useApi((signal) => documentsApi.mine(signal), []);

  return (
    <div className="space-y-6">
      <PageHeader title={t("documents.title")} />
      {loading && <PageSkeleton />}
      {error !== null && <ErrorState error={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState message={t("documents.empty")} />}

      <ul className="m-0 grid list-none gap-4 p-0">
        {data?.map((document) => {
          const token = document.verificationUrl?.split("/").pop();
          return (
            <li key={document.id} className="panel space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-bold">{t(`certType.${document.certificateType}`)}</h2>
                <div className="flex flex-wrap gap-2">
                  <DocumentStatusBadge status={document.status} />
                  {document.isTest && <TestBadge />}
                </div>
              </div>
              <dl className="m-0 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">{t("documents.number")}</dt>
                  <dd className="m-0 font-mono">{document.documentNumber}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("documents.issuedAt")}</dt>
                  <dd className="m-0">{formatDate(document.issuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("documents.validUntil")}</dt>
                  <dd className="m-0">{formatDate(document.validUntil)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                {document.status === "ISSUED" && (
                  <a href={documentDownloadUrl(document.id)} className="btn btn-primary">
                    {t("common.download")}
                  </a>
                )}
                {token && (
                  <Link to={`/verify/${token}`} className="btn btn-secondary">
                    {t("documents.verifyLink")}
                  </Link>
                )}
                <Link to={`/student/requests/${document.requestId}`} className="btn btn-secondary">
                  {t("details.title")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
