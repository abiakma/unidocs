import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nProvider";

// Turns an API error into a translated, user-facing sentence.
export function useErrorMessage(): (error: unknown) => string {
  const { t } = useI18n();
  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 0) return t("errors.network");
      if (error.status === 401) return t("errors.session");
      if (error.status === 403 && error.message.includes("CSRF")) return t("errors.session");
      if (error.status === 404) return t("errors.notFound");
      return t("errors.generic", { message: error.message });
    }
    return t("errors.generic", { message: error instanceof Error ? error.message : "unknown" });
  };
}
