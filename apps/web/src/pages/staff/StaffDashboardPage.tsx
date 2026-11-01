import { Link } from "react-router";
import { staffApi } from "../../api/endpoints";
import { RequestCard } from "../../components/RequestCard";
import { PageSkeleton } from "../../components/Skeleton";
import { EmptyState, ErrorState, PageHeader } from "../../components/States";
import { LIVE_REFRESH, useApi } from "../../hooks/useApi";
import { stepLabel, useI18n } from "../../i18n/I18nProvider";

export function StaffDashboardPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi((signal) => staffApi.queue(signal), [], LIVE_REFRESH);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("staff.title")}
        subtitle={t("staff.subtitle")}
        actions={
          <button type="button" className="btn btn-secondary" onClick={reload}>
            {t("common.refresh")}
          </button>
        }
      />
      {loading && <PageSkeleton />}
      {error !== null && <ErrorState error={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState message={t("staff.empty")} />}
      <div className="grid gap-4">
        {data?.map((request) => {
          const step = request.steps[request.currentStepIndex];
          return (
            <RequestCard
              key={request.id}
              request={request}
              href={`/staff/requests/${request.id}`}
              actions={
                <Link to={`/staff/requests/${request.id}`} className="btn btn-primary">
                  {t("common.open")}
                  {step ? ` · ${stepLabel(t, step.name)}` : ""}
                </Link>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
