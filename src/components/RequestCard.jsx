import { WORKFLOW_STEPS } from "../constants.js";
import { getStatusLabel } from "../requests.js";

// One card is used by both dashboards.
// Approve/Reject buttons appear only when onApprove and onReject are passed.
export default function RequestCard({ request, showStudent = false, onApprove, onReject }) {
  const titleId = `request-${request.id}-title`;

  let cardClass = "request-card";
  let badgeClass = "badge";
  if (request.status === "ISSUED") {
    cardClass += " is-issued";
    badgeClass += " badge-issued";
  }
  if (request.status === "REJECTED") {
    cardClass += " is-rejected";
    badgeClass += " badge-rejected";
  }

  return (
    <article className={cardClass} aria-labelledby={titleId}>
      <div className="request-card-header">
        <h3 id={titleId}>#{request.id} · {request.documentType}</h3>
        <span className={badgeClass}>{getStatusLabel(request)}</span>
      </div>

      <p className="request-meta">
        {showStudent && `${request.studentName} (${request.studentEmail}) · `}
        Purpose: {request.purpose}
      </p>

      <Progress request={request} />
      <History request={request} />

      {onApprove && onReject && (
        <div className="card-actions">
          <button
            type="button"
            className="button button-approve"
            aria-label={`Approve ${WORKFLOW_STEPS[request.stepIndex]} for request #${request.id}`}
            onClick={() => onApprove(request.id)}
          >
            Approve
          </button>
          <button
            type="button"
            className="button button-reject"
            aria-label={`Reject request #${request.id}`}
            onClick={() => onReject(request.id)}
          >
            Reject
          </button>
        </div>
      )}
    </article>
  );
}

// Workflow progress: one list item per step.
function Progress({ request }) {
  return (
    <ol className="progress" aria-label={`Progress for request #${request.id}`}>
      {WORKFLOW_STEPS.map((stepName, index) => {
        const isIssued = request.status === "ISSUED";
        const isRejected = request.status === "REJECTED";
        let stepClass = "progress-step";
        let isCurrent = false;

        if (index < request.stepIndex || (isIssued && index === request.stepIndex)) {
          stepClass += " is-done";
        } else if (index === request.stepIndex && isRejected) {
          stepClass += " is-rejected";
        } else if (index === request.stepIndex) {
          stepClass += " is-current";
          isCurrent = true;
        }

        return (
          <li key={stepName} className={stepClass} aria-current={isCurrent ? "step" : undefined}>
            {stepName}
          </li>
        );
      })}
    </ol>
  );
}

// Approval history in a collapsible <details> element.
function History({ request }) {
  return (
    <details className="history">
      <summary>History ({request.history.length})</summary>
      <ol>
        {request.history.map((entry, index) => (
          <li key={index}>{entry.date} — {entry.text}</li>
        ))}
      </ol>
    </details>
  );
}
