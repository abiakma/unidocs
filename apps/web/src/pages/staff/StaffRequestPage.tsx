import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { staffApi } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthProvider";
import { ApprovalHistory } from "../../components/ApprovalHistory";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ProfileCard } from "../../components/ProfileCard";
import { PageSkeleton } from "../../components/Skeleton";
import { ErrorState, PageHeader } from "../../components/States";
import { RequestStatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toasts";
import { WorkflowProgress } from "../../components/WorkflowProgress";
import { useApi } from "../../hooks/useApi";
import { useErrorMessage } from "../../hooks/useErrorMessage";
import { stepLabel, useI18n } from "../../i18n/I18nProvider";

type Decision = "approve" | "reject" | null;

export function StaffRequestPage() {
  const { t } = useI18n();
  const { hasRole } = useAuth();
  const toast = useToast();
  const describe = useErrorMessage();
  const navigate = useNavigate();
  const { requestId = "" } = useParams();
  const { data, error, loading, reload } = useApi((signal) => staffApi.details(requestId, signal), [requestId]);

  const [decision, setDecision] = useState<Decision>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <PageSkeleton />;
  if (error !== null || !data) return <ErrorState error={error} onRetry={reload} />;

  const { request, academicProfile, academicProfileError } = data;
  const step = request.steps[request.currentStepIndex];
  const isOpen = request.status === "PENDING" || request.status === "UNDER_REVIEW";
  const canDecide = isOpen && step !== undefined && hasRole(step.role);
  const stepName = step ? stepLabel(t, step.name) : "";

  function close() {
    setDecision(null);
    setComment("");
    setCommentError("");
  }

  async function confirm() {
    if (decision === "reject" && comment.trim().length < 3) {
      setCommentError(t("staff.reasonRequired"));
      return;
    }
    setBusy(true);
    try {
      if (decision === "approve") {
        await staffApi.approve(request.id, comment.trim());
        toast.success(t("staff.approved"));
      } else {
        await staffApi.reject(request.id, comment.trim());
        toast.success(t("staff.rejected"));
      }
      close();
      reload();
    } catch (caught) {
      toast.error(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-brand" onClick={() => navigate(-1)}>
        ← {t("common.back")}
      </button>
      <PageHeader
        title={t(`certType.${request.certificateType}`)}
        subtitle={`${t("staff.student")}: ${request.student?.fullName ?? request.student?.externalStudentId ?? "—"}`}
      />

      <section className="panel space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <RequestStatusBadge status={request.status} />
          <span className="text-muted">
            {t("requests.purpose", {
              purpose: t(`purpose.${request.purpose}`) + (request.purposeDetails ? ` (${request.purposeDetails})` : ""),
            })}
            {" · "}
            {t(`docLanguage.${request.language}`)}
          </span>
        </div>
        <WorkflowProgress request={request} />

        {isOpen && step && (
          <p className="m-0">
            <span className="font-semibold">{t("staff.currentStep")}:</span> {stepName} ({t(`role.${step.role}`)})
          </p>
        )}
        {isOpen && !canDecide && (
          <p className="m-0 text-muted" role="note">
            {t("staff.notYourStep")}
          </p>
        )}
        {canDecide && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-approve" onClick={() => setDecision("approve")}>
              {t("staff.approve")}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setDecision("reject")}>
              {t("staff.reject")}
            </button>
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {academicProfile && <ProfileCard profile={academicProfile} />}
        {academicProfileError && (
          <p className="m-0 rounded-md bg-amber-50 px-4 py-3 text-amber-900" role="alert">
            {t("staff.profileUnavailable")}
          </p>
        )}
        <ApprovalHistory request={request} />
      </div>

      <ConfirmDialog
        open={decision !== null}
        title={decision === "approve" ? t("staff.approveTitle") : t("staff.rejectTitle")}
        description={decision === "approve" ? t("staff.approveText", { step: stepName }) : t("staff.rejectText")}
        confirmLabel={decision === "approve" ? t("staff.approve") : t("staff.reject")}
        tone={decision === "approve" ? "approve" : "danger"}
        busy={busy}
        onConfirm={confirm}
        onCancel={close}
      >
        <div>
          <label htmlFor="decision-comment" className="mb-1 block font-semibold">
            {decision === "reject" ? t("staff.reason") : t("staff.comment")}
            {decision === "approve" && <span className="font-normal text-muted"> ({t("common.optional")})</span>}
          </label>
          <textarea
            id="decision-comment"
            className="field-input min-h-24"
            maxLength={1000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-invalid={Boolean(commentError)}
            aria-describedby="decision-comment-error"
          />
          <p id="decision-comment-error" className="mt-1 mb-0 text-sm text-danger empty:hidden" aria-live="polite">
            {commentError}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
