import { Link } from "react-router";
import { useI18n } from "../i18n/I18nProvider";

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      <h1 className="m-0 text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="m-0 text-muted">{t("notFound.text")}</p>
      <Link to="/" className="btn btn-secondary">
        {t("nav.home")}
      </Link>
    </div>
  );
}
