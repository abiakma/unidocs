import type { ReactNode } from "react";
import { useErrorMessage } from "../hooks/useErrorMessage";
import { useI18n } from "../i18n/I18nProvider";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-line px-4 py-8 text-center">
      <p className="m-0 text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const describe = useErrorMessage();
  return (
    <div className="rounded-md bg-red-50 px-4 py-3 text-danger" role="alert">
      <p className="m-0">{describe(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-bold text-ink sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 mb-0 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
