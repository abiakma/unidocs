import { Navigate, useSearchParams } from "react-router";
import { LOGIN_URL } from "../api/client";
import { homePathFor, useAuth } from "../auth/AuthProvider";
import { PageSkeleton } from "../components/Skeleton";
import { useI18n } from "../i18n/I18nProvider";

const ERROR_KEYS = {
  state: "login.error.state",
  denied: "login.error.denied",
  unavailable: "login.error.unavailable",
} as const;

export function LoginPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const errorParam = params.get("error");
  const errorKey = errorParam && errorParam in ERROR_KEYS ? ERROR_KEYS[errorParam as keyof typeof ERROR_KEYS] : null;

  if (loading) return <PageSkeleton cards={1} />;
  if (user) return <Navigate to={homePathFor(user.roles)} replace />;

  return (
    <div className="mx-auto max-w-md">
      <section className="panel space-y-4 text-center">
        <h1 className="m-0 text-2xl font-bold">{t("login.title")}</h1>
        {errorKey && (
          <p className="m-0 rounded-md bg-red-50 px-4 py-3 text-danger" role="alert">
            {t(errorKey)}
          </p>
        )}
        <p className="m-0 text-muted">{t("login.text")}</p>
        <a href={LOGIN_URL} className="btn btn-primary w-full">
          {t("login.button")}
        </a>
        <p className="m-0 text-sm text-muted">{t("login.staffNote")}</p>
      </section>
    </div>
  );
}
