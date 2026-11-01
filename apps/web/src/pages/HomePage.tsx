import { Link } from "react-router";
import { LOGIN_URL } from "../api/client";
import { homePathFor, useAuth } from "../auth/AuthProvider";
import type { MessageKey } from "../i18n/messages/kk";
import { useI18n } from "../i18n/I18nProvider";

const FEATURES: { title: MessageKey; text: MessageKey }[] = [
  { title: "home.feature1.title", text: "home.feature1.text" },
  { title: "home.feature2.title", text: "home.feature2.text" },
  { title: "home.feature3.title", text: "home.feature3.text" },
];

export function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <section className="rounded-[10px] bg-brand-soft px-6 py-10 sm:px-10">
        <p className="m-0 text-sm font-semibold tracking-wide text-accent uppercase">{t("app.university")}</p>
        <h1 className="mt-2 mb-3 text-3xl font-bold text-brand sm:text-4xl">{t("home.title")}</h1>
        <p className="m-0 max-w-2xl text-lg text-ink">{t("home.subtitle")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <Link to={homePathFor(user.roles)} className="btn btn-primary">
              {t("home.goToDashboard")}
            </Link>
          ) : (
            <a href={LOGIN_URL} className="btn btn-primary">
              {t("home.login")}
            </a>
          )}
          <Link to="/verify" className="btn btn-secondary">
            {t("nav.verify")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="panel">
            <h2 className="mt-0 mb-2 text-lg font-bold text-brand">{t(feature.title)}</h2>
            <p className="m-0 text-muted">{t(feature.text)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
