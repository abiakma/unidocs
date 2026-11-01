import { useState } from "react";
import { Link } from "react-router";
import { documentDownloadUrl } from "../../api/client";
import { documentsApi } from "../../api/endpoints";
import type { SigningQueue } from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageSkeleton } from "../../components/Skeleton";
import { EmptyState, ErrorState, PageHeader } from "../../components/States";
import { useToast } from "../../components/Toasts";
import { LIVE_REFRESH, useApi } from "../../hooks/useApi";
import { useErrorMessage } from "../../hooks/useErrorMessage";
import { useI18n } from "../../i18n/I18nProvider";

type QueueItem = SigningQueue["awaitingSignature"][number];

export function SignerDashboardPage() {
  const { t, formatDate } = useI18n();
  const toast = useToast();
  const describe = useErrorMessage();
  const queue = useApi((signal) => documentsApi.signingQueue(signal), [], LIVE_REFRESH);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [busy, setBusy] = useState(false);

  const isTestSigning = queue.data ? !queue.data.signing.legallyValid : true;

  async function sign() {
    if (!selected) return;
    setBusy(true);
    try {
      await documentsApi.sign(selected.documentId);
      toast.success(t("signer.signed"));
      setSelected(null);
      queue.reload();
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setBusy(false);
    }
  }

  async function prepare(requestId: string) {
    try {
      await documentsApi.prepare(requestId);
      toast.success(t("signer.prepared"));
      queue.reload();
    } catch (error) {
      toast.error(describe(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("signer.title")}
        actions={
          <>
          <button type="button" className="btn btn-secondary" onClick={queue.reload}>
            {t("common.refresh")}
          </button>
          <Link to="/staff" className="btn btn-secondary">
            {t("signer.approvalsLink")}
          </Link>
          </>
        }
      />

      {queue.loading && <PageSkeleton />}
      {queue.error !== null && <ErrorState error={queue.error} onRetry={queue.reload} />}

      {queue.data && (
        <>
          <section className="panel space-y-3" aria-labelledby="awaiting-signature-title">
            <h2 id="awaiting-signature-title" className="m-0 text-xl font-bold">
              {t("signer.awaitingSignature")}
            </h2>
            {queue.data.awaitingSignature.length === 0 && <EmptyState message={t("signer.empty")} />}
            <ul className="m-0 grid list-none gap-3 p-0">
              {queue.data.awaitingSignature.map((item) => (
                <li key={item.documentId} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line p-4">
                  <div>
                    <p className="m-0 font-semibold">
                      {t(`certType.${item.certificateType}`)} · <span className="font-mono">{item.documentNumber}</span>
                    </p>
                    <p className="m-0 text-sm text-muted">
                      {item.studentName} · {t(`docLanguage.${item.language}`)} · {t("signer.preparedAt", { date: formatDate(item.preparedAt) })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={documentDownloadUrl(item.documentId, true)} target="_blank" rel="noopener" className="btn btn-secondary">
                      {t("common.preview")}
                    </a>
                    <button type="button" className="btn btn-primary" onClick={() => setSelected(item)}>
                      {t("signer.sign")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {queue.data.awaitingPreparation.length > 0 && (
            <section className="panel space-y-3" aria-labelledby="awaiting-preparation-title">
              <h2 id="awaiting-preparation-title" className="m-0 text-xl font-bold">
                {t("signer.awaitingPreparation")}
              </h2>
              <p className="m-0 text-muted">{t("signer.preparationHint")}</p>
              <ul className="m-0 grid list-none gap-3 p-0">
                {queue.data.awaitingPreparation.map((item) => (
                  <li key={item.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line p-4">
                    <span>
                      {t(`certType.${item.certificateType}`)} · {formatDate(item.approvedAt)}
                    </span>
                    <button type="button" className="btn btn-secondary" onClick={() => prepare(item.requestId)}>
                      {t("signer.prepare")}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={selected !== null}
        title={t("signer.signTitle")}
        description={t("signer.signText", { number: selected?.documentNumber ?? "" })}
        confirmLabel={t("signer.sign")}
        busy={busy}
        onConfirm={sign}
        onCancel={() => setSelected(null)}
      >
        {isTestSigning && (
          <p className="m-0 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-danger" role="note">
            {t("signer.mockWarning")}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
