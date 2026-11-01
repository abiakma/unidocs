import { useState } from "react";
import { adminApi } from "../../api/endpoints";
import { PageSkeleton } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { useApi } from "../../hooks/useApi";
import { useI18n } from "../../i18n/I18nProvider";

export function AuditTab() {
  const { t, language } = useI18n();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi((signal) => adminApi.auditLogs(page, signal), [page]);
  const formatter = new Intl.DateTimeFormat(language === "en" ? "en-GB" : `${language}-KZ`, { dateStyle: "short", timeStyle: "medium" });

  if (loading && !data) return <PageSkeleton cards={1} />;
  if (error !== null || !data) return <ErrorState error={error} onRetry={reload} />;

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-[10px] border border-line">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-3 py-2">{t("admin.audit.time")}</th>
              <th scope="col" className="px-3 py-2">{t("admin.audit.action")}</th>
              <th scope="col" className="px-3 py-2">{t("admin.audit.entity")}</th>
              <th scope="col" className="px-3 py-2">{t("admin.audit.user")}</th>
              <th scope="col" className="px-3 py-2">{t("admin.audit.ip")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((entry) => (
              <tr key={entry.id} className="border-t border-line align-top">
                <td className="px-3 py-2 whitespace-nowrap">{formatter.format(new Date(entry.createdAt))}</td>
                <td className="px-3 py-2 font-mono">
                  {entry.action}
                  {entry.metadata !== null && (
                    <details>
                      <summary className="cursor-pointer text-xs text-brand">metadata</summary>
                      <pre className="m-0 max-w-md overflow-x-auto text-xs whitespace-pre-wrap">{JSON.stringify(entry.metadata, null, 2)}</pre>
                    </details>
                  )}
                </td>
                <td className="px-3 py-2">
                  {entry.entityType}
                  {entry.entityId && <div className="font-mono text-xs text-muted">{entry.entityId}</div>}
                </td>
                <td className="px-3 py-2">{entry.user ? (entry.user.displayName ?? entry.user.externalUserId) : "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{entry.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="flex items-center gap-3" aria-label={t("admin.tab.audit")}>
        <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          {t("admin.audit.prev")}
        </button>
        <span className="text-muted">{t("admin.audit.page", { page, pages })}</span>
        <button type="button" className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
          {t("admin.audit.next")}
        </button>
      </nav>
    </div>
  );
}
