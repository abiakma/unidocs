import { useSearchParams } from "react-router";
import { authApi } from "../api/endpoints";
import type { MockIdentity } from "../api/types";
import { PageSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/States";
import { useApi } from "../hooks/useApi";
import { useI18n } from "../i18n/I18nProvider";

// DEVELOPMENT ONLY. Stands in for the Platonus login page. The API returns 404 for
// the identity list unless AUTH_PROVIDER=mock outside production.
export function MockLoginPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const state = params.get("state");
  const { data, error, loading, reload } = useApi((signal) => authApi.mockIdentities(signal), []);

  function callbackUrl(identity: MockIdentity): string {
    const query = new URLSearchParams({ code: identity.id, state: state ?? "" });
    return `/api/auth/callback?${query.toString()}`;
  }

  function group(kind: MockIdentity["kind"], title: string) {
    const identities = (data ?? []).filter((identity) => identity.kind === kind);
    return (
      <section className="panel">
        <h2 className="mt-0 mb-3 text-lg font-bold">{title}</h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {identities.map((identity) => (
            <li key={identity.id}>
              <a
                href={callbackUrl(identity)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-4 py-3 text-ink no-underline hover:border-brand hover:bg-brand-soft"
              >
                <span className="font-semibold">{identity.label}</span>
                <span className="text-sm text-muted">
                  {identity.id} · {t(`role.${identity.roleHint}`)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="m-0 rounded-md border-2 border-dashed border-amber-500 bg-amber-50 px-4 py-3 font-bold text-amber-900" role="note">
        {t("mock.banner")}
      </p>
      <h1 className="m-0 text-2xl font-bold">{t("mock.title")}</h1>
      {!state && (
        <p className="m-0 text-danger" role="alert">
          {t("mock.noState")}
        </p>
      )}
      {loading && <PageSkeleton cards={2} />}
      {error !== null && <ErrorState error={error} onRetry={reload} />}
      {data && state && (
        <>
          {group("student", t("mock.students"))}
          {group("staff", t("mock.staff"))}
        </>
      )}
    </div>
  );
}
