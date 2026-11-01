import { Link } from "react-router";
import { requestsApi } from "../../api/endpoints";
import { RequestCard } from "../../components/RequestCard";
import { PageSkeleton } from "../../components/Skeleton";
import { EmptyState, ErrorState, PageHeader } from "../../components/States";
import { LIVE_REFRESH, useApi } from "../../hooks/useApi";
import { useI18n } from "../../i18n/I18nProvider";

export function MyRequestsPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi((signal) => requestsApi.mine(signal), [], LIVE_REFRESH);
  const newRequestLink = (
    <Link to="/student/requests/new" className="btn btn-primary">
      {t("student.newRequestCta")}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("requests.title")} actions={newRequestLink} />
      {loading && <PageSkeleton />}
      {error !== null && <ErrorState error={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState message={t("requests.empty")} action={newRequestLink} />}
      <div className="grid gap-4">
        {data?.map((request) => (
          <RequestCard key={request.id} request={request} href={`/student/requests/${request.id}`} />
        ))}
      </div>
    </div>
  );
}
