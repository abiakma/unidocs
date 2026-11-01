import { useState } from "react";
import { documentDownloadUrl } from "../../api/client";
import { adminApi } from "../../api/endpoints";
import { REQUEST_STATUSES, type RequestStatus, type RequestView } from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { RequestCard } from "../../components/RequestCard";
import { PageSkeleton } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { useToast } from "../../components/Toasts";
import { LIVE_REFRESH, useApi } from "../../hooks/useApi";
import { useErrorMessage } from "../../hooks/useErrorMessage";
import { useI18n } from "../../i18n/I18nProvider";

type IssuedDocument = NonNullable<RequestView["document"]>;

export function RequestsTab() {
  const { t } = useI18n();
  const toast = useToast();
  const describe = useErrorMessage();
  const [status, setStatus] = useState<RequestStatus | "">("");
  const { data, error, loading, reload } = useApi((signal) => adminApi.requests(status, signal), [status], LIVE_REFRESH);

  const [revoking, setRevoking] = useState<IssuedDocument | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);

  function closeRevoke() {
    setRevoking(null);
    setReason("");
    setReasonError("");
  }

  async function revoke() {
    if (!revoking) return;
    if (reason.trim().length < 5) {
      setReasonError(t("admin.revokeReason"));
      return;
    }
    setBusy(true);
    try {
      await adminApi.revoke(revoking.id, reason.trim());
      toast.success(t("admin.revoked"));
      closeRevoke();
      reload();
    } catch (caught) {
      toast.error(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <label htmlFor="status-filter" className="mb-1 block font-semibold">
          {t("admin.requests.filter")}
        </label>
        <select
          id="status-filter"
          className="field-input"
          value={status}
          onChange={(event) => setStatus(event.target.value as RequestStatus | "")}
        >
          <option value="">{t("common.all")}</option>
          {REQUEST_STATUSES.map((item) => (
            <option key={item} value={item}>
              {t(`status.${item}`)}
            </option>
          ))}
        </select>
      </div>

      {loading && <PageSkeleton />}
      {error !== null && <ErrorState error={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState message={t("admin.requests.empty")} />}
      <div className="grid gap-4">
        {data?.map((request) => {
          const document = request.document;
          return (
            <RequestCard
              key={request.id}
              request={request}
              href={`/staff/requests/${request.id}`}
              actions={
                document && document.status !== "AWAITING_SIGNATURE" ? (
                  <>
                    <a href={documentDownloadUrl(document.id, true)} target="_blank" rel="noopener" className="btn btn-secondary">
                      {t("common.preview")} · {document.documentNumber}
                    </a>
                    {document.status === "ISSUED" && (
                      <button type="button" className="btn btn-danger" onClick={() => setRevoking(document)}>
                        {t("admin.revoke")}
                      </button>
                    )}
                  </>
                ) : undefined
              }
            />
          );
        })}
      </div>

      <ConfirmDialog
        open={revoking !== null}
        title={t("admin.revokeTitle")}
        description={t("admin.revokeText", { number: revoking?.documentNumber ?? "" })}
        confirmLabel={t("admin.revoke")}
        tone="danger"
        busy={busy}
        onConfirm={revoke}
        onCancel={closeRevoke}
      >
        <div>
          <label htmlFor="revoke-reason" className="mb-1 block font-semibold">
            {t("admin.revokeReason")}
          </label>
          <textarea
            id="revoke-reason"
            className="field-input min-h-20"
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={Boolean(reasonError)}
            aria-describedby="revoke-reason-error"
          />
          <p id="revoke-reason-error" className="mt-1 mb-0 text-sm text-danger empty:hidden" aria-live="polite">
            {reasonError}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
