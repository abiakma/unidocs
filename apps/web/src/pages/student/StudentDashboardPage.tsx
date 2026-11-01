import { Link } from "react-router";
import { documentsApi, requestsApi, studentApi } from "../../api/endpoints";
import { ProfileCard } from "../../components/ProfileCard";
import { RequestCard } from "../../components/RequestCard";
import { CardSkeleton, PageSkeleton } from "../../components/Skeleton";
import { EmptyState, ErrorState, PageHeader } from "../../components/States";
import { useApi } from "../../hooks/useApi";
import { useI18n } from "../../i18n/I18nProvider";

const IN_PROGRESS = new Set(["PENDING", "UNDER_REVIEW", "APPROVED", "AWAITING_SIGNATURE"]);

export function StudentDashboardPage() {
  const { t } = useI18n();
  const profile = useApi((signal) => studentApi.profile(signal), []);
  const requests = useApi((signal) => requestsApi.mine(signal), []);
  const documents = useApi((signal) => documentsApi.mine(signal), []);

  const inProgress = requests.data?.filter((request) => IN_PROGRESS.has(request.status)).length ?? 0;
  const issued = documents.data?.filter((document) => document.status === "ISSUED").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("student.title")}
        actions={
          <Link to="/student/requests/new" className="btn btn-primary">
            {t("student.newRequestCta")}
          </Link>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
        {profile.loading && <CardSkeleton lines={6} />}
        {profile.error !== null && <ErrorState error={profile.error} onRetry={profile.reload} />}
        {profile.data && <ProfileCard profile={profile.data} />}

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Link to="/student/requests" className="panel block text-ink no-underline hover:border-brand">
              <p className="m-0 text-3xl font-bold text-brand">{requests.loading ? "…" : inProgress}</p>
              <p className="m-0 text-muted">{t("student.inProgress")}</p>
            </Link>
            <Link to="/student/documents" className="panel block text-ink no-underline hover:border-brand">
              <p className="m-0 text-3xl font-bold text-success">{documents.loading ? "…" : issued}</p>
              <p className="m-0 text-muted">{t("student.issued")}</p>
            </Link>
          </div>

          <section className="panel space-y-3" aria-labelledby="recent-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="recent-title" className="m-0 text-xl font-bold">
                {t("student.recent")}
              </h2>
              <Link to="/student/requests" className="text-brand">
                {t("student.viewAll")}
              </Link>
            </div>
            {requests.loading && <PageSkeleton cards={1} />}
            {requests.error !== null && <ErrorState error={requests.error} onRetry={requests.reload} />}
            {requests.data?.length === 0 && <EmptyState message={t("requests.empty")} />}
            {requests.data?.slice(0, 3).map((request) => (
              <RequestCard key={request.id} request={request} href={`/student/requests/${request.id}`} />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
