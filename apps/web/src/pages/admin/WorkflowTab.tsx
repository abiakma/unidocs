import { useState } from "react";
import { adminApi } from "../../api/endpoints";
import { APPROVER_ROLE_NAMES, CERTIFICATE_TYPES, type CertificateType, type RoleName, type WorkflowStep } from "../../api/types";
import { PageSkeleton } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { useToast } from "../../components/Toasts";
import { useApi } from "../../hooks/useApi";
import { useErrorMessage } from "../../hooks/useErrorMessage";
import { stepLabel, useI18n } from "../../i18n/I18nProvider";

type Scope = CertificateType | "DEFAULT";

export function WorkflowTab() {
  const { t } = useI18n();
  const toast = useToast();
  const describe = useErrorMessage();
  const { data, error, loading, reload } = useApi((signal) => adminApi.workflow(signal), []);
  const [scope, setScope] = useState<Scope>("DEFAULT");
  // Unsaved edits per scope; without a draft the saved chain is shown.
  const [drafts, setDrafts] = useState<Partial<Record<Scope, WorkflowStep[]>>>({});
  const [busy, setBusy] = useState(false);

  const override = scope === "DEFAULT" ? undefined : data?.overrides[scope];
  const saved = data ? (scope === "DEFAULT" ? data.defaultSteps : (override ?? data.defaultSteps)) : [];
  const steps = drafts[scope] ?? saved;

  function setSteps(next: WorkflowStep[]) {
    setDrafts((current) => ({ ...current, [scope]: next }));
  }

  function update(index: number, patch: Partial<WorkflowStep>) {
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...steps];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + delta, 0, item);
    setSteps(next);
  }

  async function save(nextSteps: WorkflowStep[]) {
    setBusy(true);
    try {
      await adminApi.updateWorkflow(scope === "DEFAULT" ? null : scope, nextSteps);
      toast.success(t("admin.workflow.saved"));
      setDrafts((current) => ({ ...current, [scope]: undefined }));
      reload();
    } catch (caught) {
      toast.error(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSkeleton cards={1} />;
  if (error !== null || !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <p className="m-0 text-muted">{t("admin.workflow.hint")}</p>

      <div className="max-w-sm">
        <label htmlFor="workflow-scope" className="mb-1 block font-semibold">
          {t("admin.workflow.scope")}
        </label>
        <select id="workflow-scope" className="field-input" value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
          <option value="DEFAULT">{t("admin.workflow.default")}</option>
          {CERTIFICATE_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`certType.${type}`)}
            </option>
          ))}
        </select>
      </div>

      {scope !== "DEFAULT" && !override && <p className="m-0 text-sm text-muted">{t("admin.workflow.usesDefault")}</p>}

      <ol className="m-0 grid list-none gap-3 p-0">
        {steps.map((step, index) => (
          <li key={index} className="panel grid gap-3 sm:grid-cols-[2rem_1fr_1fr_auto] sm:items-end">
            <span className="text-lg font-bold text-brand" aria-hidden="true">
              {index + 1}.
            </span>
            <div>
              <label htmlFor={`step-name-${index}`} className="mb-1 block text-sm font-semibold">
                {t("admin.workflow.stepName")}
              </label>
              <input
                id={`step-name-${index}`}
                className="field-input"
                maxLength={80}
                value={step.name}
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <span className="text-xs text-muted">{stepLabel(t, step.name)}</span>
            </div>
            <div>
              <label htmlFor={`step-role-${index}`} className="mb-1 block text-sm font-semibold">
                {t("admin.workflow.stepRole")}
              </label>
              <select
                id={`step-role-${index}`}
                className="field-input"
                value={step.role}
                onChange={(event) => update(index, { role: event.target.value as RoleName })}
              >
                {APPROVER_ROLE_NAMES.map((role) => (
                  <option key={role} value={role}>
                    {t(`role.${role}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" className="btn btn-secondary px-2 py-1 text-sm" disabled={index === 0} onClick={() => move(index, -1)}>
                {t("admin.workflow.moveUp")}
              </button>
              <button
                type="button"
                className="btn btn-secondary px-2 py-1 text-sm"
                disabled={index === steps.length - 1}
                onClick={() => move(index, 1)}
              >
                {t("admin.workflow.moveDown")}
              </button>
              <button
                type="button"
                className="btn btn-danger px-2 py-1 text-sm"
                disabled={steps.length === 1}
                onClick={() => setSteps(steps.filter((_, i) => i !== index))}
              >
                {t("admin.workflow.remove")}
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={steps.length >= 6}
          onClick={() => setSteps([...steps, { role: "SPECIALIST", name: "ENROLLMENT_VERIFICATION" }])}
        >
          {t("admin.workflow.addStep")}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(steps)}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
        {override && (
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => save([])}>
            {t("admin.workflow.removeOverride")}
          </button>
        )}
      </div>
    </div>
  );
}
