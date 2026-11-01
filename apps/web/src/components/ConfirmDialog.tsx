import { type FormEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "primary" | "approve" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

const TONES = { primary: "btn-primary", approve: "btn-approve", danger: "btn-danger" } as const;

// Native <dialog>: focus trapping, Escape to close and inert background come from the browser.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!busy) onConfirm();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[10px] border border-line p-0 shadow-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <h2 id={titleId} className="m-0 text-lg font-bold">
          {title}
        </h2>
        <p id={descriptionId} className="m-0 text-muted">
          {description}
        </p>
        {children}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button type="submit" className={`btn ${TONES[tone]}`} disabled={busy}>
            {busy ? t("common.saving") : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
