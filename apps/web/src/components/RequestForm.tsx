import { type FormEvent, useRef, useState } from "react";
import { type NewRequestInput } from "../api/endpoints";
import {
  CERTIFICATE_TYPES,
  type CertificatePurpose,
  type CertificateType,
  DOCUMENT_LANGUAGES,
  type DocumentLanguage,
  PURPOSES,
} from "../api/types";
import { useI18n } from "../i18n/I18nProvider";

const DETAILS_MAX = 200;

interface Errors {
  certificateType?: string;
  purpose?: string;
  purposeDetails?: string;
}

export function RequestForm({ onSubmit }: { onSubmit: (input: NewRequestInput) => Promise<void> }) {
  const { t, language } = useI18n();
  const [certificateType, setCertificateType] = useState<CertificateType | "">("");
  const [purpose, setPurpose] = useState<CertificatePurpose | "">("");
  const [purposeDetails, setPurposeDetails] = useState("");
  const [documentLanguage, setDocumentLanguage] = useState<DocumentLanguage>(language === "ru" ? "RU" : language === "en" ? "EN" : "KK");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Used to move focus to the first field with an error.
  const typeRef = useRef<HTMLSelectElement>(null);
  const purposeRef = useRef<HTMLSelectElement>(null);
  const detailsRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (!certificateType) nextErrors.certificateType = t("request.errorType");
    if (!purpose) nextErrors.purpose = t("request.errorPurpose");
    if (purposeDetails.trim().length > DETAILS_MAX) nextErrors.purposeDetails = t("request.errorDetails");
    setErrors(nextErrors);

    if (nextErrors.certificateType) return typeRef.current?.focus();
    if (nextErrors.purpose) return purposeRef.current?.focus();
    if (nextErrors.purposeDetails) return detailsRef.current?.focus();
    if (!certificateType || !purpose) return;

    setSubmitting(true);
    try {
      await onSubmit({
        certificateType,
        purpose,
        language: documentLanguage,
        ...(purposeDetails.trim() ? { purposeDetails: purposeDetails.trim() } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="panel space-y-4" aria-labelledby="request-form-title">
      <h2 id="request-form-title" className="m-0 text-xl font-bold">
        {t("request.formTitle")}
      </h2>

      <div>
        <label htmlFor="certificate-type" className="mb-1 block font-semibold">
          {t("request.type")}
        </label>
        <select
          id="certificate-type"
          ref={typeRef}
          className="field-input"
          value={certificateType}
          onChange={(event) => setCertificateType(event.target.value as CertificateType | "")}
          required
          aria-invalid={Boolean(errors.certificateType)}
          aria-describedby="certificate-type-error"
        >
          <option value="">{t("request.typePlaceholder")}</option>
          {CERTIFICATE_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`certType.${type}`)}
            </option>
          ))}
        </select>
        <p id="certificate-type-error" className="mt-1 mb-0 text-sm text-danger empty:hidden" aria-live="polite">
          {errors.certificateType}
        </p>
      </div>

      <div>
        <label htmlFor="purpose" className="mb-1 block font-semibold">
          {t("request.purpose")}
        </label>
        <select
          id="purpose"
          ref={purposeRef}
          className="field-input"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value as CertificatePurpose | "")}
          required
          aria-invalid={Boolean(errors.purpose)}
          aria-describedby="purpose-error"
        >
          <option value="">{t("request.purposePlaceholder")}</option>
          {PURPOSES.map((item) => (
            <option key={item} value={item}>
              {t(`purpose.${item}`)}
            </option>
          ))}
        </select>
        <p id="purpose-error" className="mt-1 mb-0 text-sm text-danger empty:hidden" aria-live="polite">
          {errors.purpose}
        </p>
      </div>

      <div>
        <label htmlFor="purpose-details" className="mb-1 block font-semibold">
          {t("request.details")} <span className="font-normal text-muted">({t("common.optional")})</span>
        </label>
        <input
          id="purpose-details"
          ref={detailsRef}
          className="field-input"
          value={purposeDetails}
          maxLength={DETAILS_MAX}
          onChange={(event) => setPurposeDetails(event.target.value)}
          aria-invalid={Boolean(errors.purposeDetails)}
          aria-describedby="purpose-details-hint purpose-details-error"
        />
        <p id="purpose-details-hint" className="mt-1 mb-0 text-sm text-muted">
          {t("request.detailsHint")}
        </p>
        <p id="purpose-details-error" className="mt-1 mb-0 text-sm text-danger empty:hidden" aria-live="polite">
          {errors.purposeDetails}
        </p>
      </div>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1 font-semibold">{t("request.language")}</legend>
        <div className="flex flex-wrap gap-4">
          {DOCUMENT_LANGUAGES.map((code) => (
            <label key={code} className="flex items-center gap-2 font-normal">
              <input
                type="radio"
                name="document-language"
                value={code}
                checked={documentLanguage === code}
                onChange={() => setDocumentLanguage(code)}
              />
              {t(`docLanguage.${code}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? t("request.submitting") : t("request.submit")}
      </button>
    </form>
  );
}
