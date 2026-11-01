import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { documentsApi } from "../api/endpoints";
import type { SignatureCheck, VerificationStatus } from "../api/types";
import { PageSkeleton } from "../components/Skeleton";
import { ErrorState, PageHeader } from "../components/States";
import { useApi } from "../hooks/useApi";
import { useI18n } from "../i18n/I18nProvider";

const STATUS_STYLES: Record<VerificationStatus, { box: string; icon: string }> = {
  VALID: { box: "border-green-300 bg-green-50 text-green-900", icon: "✓" },
  SIGNATURE_NOT_VERIFIED: { box: "border-amber-300 bg-amber-50 text-amber-900", icon: "!" },
  EXPIRED: { box: "border-amber-300 bg-amber-50 text-amber-900", icon: "⌛" },
  REVOKED: { box: "border-red-300 bg-red-50 text-red-900", icon: "✕" },
  NOT_FOUND: { box: "border-slate-300 bg-slate-50 text-slate-800", icon: "?" },
};

const SIGNATURE_STYLES: Record<SignatureCheck, string> = {
  VERIFIED: "text-success",
  NOT_VERIFIED: "text-amber-700",
  TEST_ONLY: "text-danger",
};

// Accepts a bare token or a full verification URL pasted from a QR scanner.
export function extractToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

function VerifyForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const token = extractToken(value);
    setInvalid(!token);
    if (token) navigate(`/verify/${token}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="panel space-y-3">
      <label htmlFor="verify-input" className="block font-semibold">
        {t("verify.inputLabel")}
      </label>
      <input
        id="verify-input"
        className="field-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={invalid}
        aria-describedby="verify-error"
        autoComplete="off"
        spellCheck={false}
      />
      <p id="verify-error" className="m-0 text-sm text-danger" aria-live="polite">
        {invalid ? t("verify.invalidInput") : ""}
      </p>
      <button type="submit" className="btn btn-primary">
        {t("verify.check")}
      </button>
    </form>
  );
}

function VerificationResultView({ token }: { token: string }) {
  const { t, formatDate } = useI18n();
  const { data, error, loading, reload } = useApi((signal) => documentsApi.verify(token, signal), [token]);

  if (loading) return <PageSkeleton cards={1} />;
  if (error !== null || !data) return <ErrorState error={error} onRetry={reload} />;

  const style = STATUS_STYLES[data.status];
  const document = data.document;

  return (
    <div className="space-y-4">
      <section className={`flex items-start gap-4 rounded-[10px] border-2 p-5 ${style.box}`} role="status">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl font-bold" aria-hidden="true">
          {style.icon}
        </span>
        <div>
          <h2 className="m-0 text-xl font-bold">{t(`verify.status.${data.status}`)}</h2>
          <p className="mt-1 mb-0">{t(`verify.desc.${data.status}`)}</p>
        </div>
      </section>

      {document?.isTestDocument && (
        <p className="m-0 rounded-md border-2 border-dashed border-red-400 bg-red-50 px-4 py-3 font-bold text-danger" role="note">
          {t("verify.testNotice")}
        </p>
      )}

      {document && (
        <section className="panel">
          <dl className="m-0 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            <dt className="font-semibold text-muted">{t("verify.university")}</dt>
            <dd className="m-0">{t("app.university")}</dd>
            <dt className="font-semibold text-muted">{t("verify.number")}</dt>
            <dd className="m-0 font-mono">{document.documentNumber}</dd>
            <dt className="font-semibold text-muted">{t("verify.type")}</dt>
            <dd className="m-0">{t(`certType.${document.certificateType}`)}</dd>
            <dt className="font-semibold text-muted">{t("verify.issuedAt")}</dt>
            <dd className="m-0">{formatDate(document.issuedAt)}</dd>
            <dt className="font-semibold text-muted">{t("verify.validUntil")}</dt>
            <dd className="m-0">{formatDate(document.validUntil)}</dd>
            {document.revokedAt && (
              <>
                <dt className="font-semibold text-muted">{t("verify.revokedAt")}</dt>
                <dd className="m-0">{formatDate(document.revokedAt)}</dd>
              </>
            )}
            <dt className="font-semibold text-muted">{t("verify.signer")}</dt>
            <dd className="m-0">{document.signerDesignation ?? "—"}</dd>
            <dt className="font-semibold text-muted">{t("verify.signature")}</dt>
            <dd className={`m-0 font-semibold ${SIGNATURE_STYLES[document.signatureCheck]}`}>
              {t(`verify.signature.${document.signatureCheck}`)}
            </dd>
          </dl>
        </section>
      )}

      <p className="m-0 text-sm text-muted">{t("verify.privacy")}</p>
      <Link to="/verify" className="btn btn-secondary">
        {t("verify.again")}
      </Link>
    </div>
  );
}

export function VerifyPage() {
  const { t } = useI18n();
  const { token } = useParams();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("verify.title")} subtitle={token ? undefined : t("verify.intro")} />
      {token ? <VerificationResultView token={token} /> : <VerifyForm />}
    </div>
  );
}
