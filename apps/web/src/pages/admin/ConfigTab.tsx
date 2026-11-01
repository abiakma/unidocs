import { adminApi } from "../../api/endpoints";
import { PageSkeleton } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { useApi } from "../../hooks/useApi";
import { useI18n } from "../../i18n/I18nProvider";

export function ConfigTab() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi((signal) => adminApi.config(signal), []);

  if (loading) return <PageSkeleton cards={1} />;
  if (error !== null || !data) return <ErrorState error={error} onRetry={reload} />;

  const usesMocks = [data.authProvider, data.studentDataProvider, data.signingProvider].includes("mock");

  return (
    <div className="space-y-4">
      {usesMocks && (
        <p className="m-0 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900" role="note">
          {t("admin.config.mockWarning")}
        </p>
      )}
      <dl className="panel m-0 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="font-mono text-sm text-muted">{key}</dt>
            <dd className="m-0 font-mono text-sm">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
