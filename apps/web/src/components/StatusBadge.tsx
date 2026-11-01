import type { DocumentStatus, RequestStatus } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";

const REQUEST_STYLES: Record<RequestStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-indigo-100 text-indigo-800",
  AWAITING_SIGNATURE: "bg-violet-100 text-violet-800",
  ISSUED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const DOCUMENT_STYLES: Record<DocumentStatus, string> = {
  AWAITING_SIGNATURE: "bg-violet-100 text-violet-800",
  ISSUED: "bg-green-100 text-green-800",
  REVOKED: "bg-red-100 text-red-800",
};

const BASE = "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useI18n();
  return <span className={`${BASE} ${REQUEST_STYLES[status]}`}>{t(`status.${status}`)}</span>;
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useI18n();
  return <span className={`${BASE} ${DOCUMENT_STYLES[status]}`}>{t(`docStatus.${status}`)}</span>;
}

export function TestBadge() {
  const { t } = useI18n();
  return <span className={`${BASE} border border-red-300 bg-red-50 text-danger`}>{t("documents.test")}</span>;
}
