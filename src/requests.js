// Pure functions for document requests.
// They never change the old request; they return a new object instead,
// which is how React state should be updated.
import { WORKFLOW_STEPS } from "./constants.js";

function today() {
  return new Date().toLocaleDateString();
}

export function createRequest(id, student, documentType, purpose) {
  return {
    id,
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    documentType,
    purpose,
    stepIndex: 0,            // position in WORKFLOW_STEPS
    status: "IN_PROGRESS",   // IN_PROGRESS, ISSUED or REJECTED
    history: [{ date: today(), text: "Request submitted by student" }],
  };
}

// Admin approves the current step: move to the next one.
export function approveRequest(request) {
  if (request.status !== "IN_PROGRESS") return request;

  const approvedStep = WORKFLOW_STEPS[request.stepIndex];
  const stepIndex = request.stepIndex + 1;
  const history = [...request.history, { date: today(), text: `${approvedStep} approved` }];

  // The last step means the document is issued.
  if (stepIndex === WORKFLOW_STEPS.length - 1) {
    return {
      ...request,
      stepIndex,
      status: "ISSUED",
      history: [...history, { date: today(), text: "Document issued" }],
    };
  }

  return { ...request, stepIndex, history };
}

export function rejectRequest(request) {
  if (request.status !== "IN_PROGRESS") return request;

  return {
    ...request,
    status: "REJECTED",
    history: [
      ...request.history,
      { date: today(), text: `Rejected at ${WORKFLOW_STEPS[request.stepIndex]}` },
    ],
  };
}

export function getStatusLabel(request) {
  if (request.status === "REJECTED") return "Rejected";
  return WORKFLOW_STEPS[request.stepIndex];
}

// Initial requests shown on the dashboards.
export function createInitialRequests(users) {
  const first = approveRequest(createRequest(1, users[0], "Enrollment Certificate", "Bank"));
  const second = createRequest(2, users[1], "Visa Support Letter", "Visa application");
  const third = approveRequest(
    approveRequest(createRequest(3, users[2], "Transcript Request", "Scholarship"))
  );

  return [first, second, third];
}
