// UniDocs — frontend (vanilla JavaScript)

const USERS_URL = "https://jsonplaceholder.typicode.com/users";

// Every request moves through these steps in order.
const WORKFLOW_STEPS = [
  "Submitted",
  "Academic Verification",
  "Financial Clearance",
  "Director Approval",
  "Issued",
];

// ===== Central application state =====
// The whole UI is drawn from this one object.
const appState = {
  role: "student",        // "student" or "admin"
  users: [],              // users from the API
  currentStudent: null,   // the signed-in student
  requests: [],           // all document requests
  nextRequestId: 1,
  isLoading: false,
  error: null,
};

// ===== DOM elements =====
const loadingMessage = document.getElementById("loading-message");
const errorBox = document.getElementById("error-box");
const errorMessage = document.getElementById("error-message");
const retryButton = document.getElementById("retry-button");

const roleButtons = document.querySelectorAll(".role-button");
const navLinks = document.getElementById("nav-links");

const studentView = document.getElementById("student-view");
const profileDetails = document.getElementById("profile-details");
const requestForm = document.getElementById("request-form");
const documentTypeSelect = document.getElementById("document-type");
const purposeSelect = document.getElementById("purpose");
const formSuccess = document.getElementById("form-success");
const myRequestList = document.getElementById("my-request-list");

const adminView = document.getElementById("admin-view");
const pendingList = document.getElementById("pending-list");
const closedList = document.getElementById("closed-list");

// ===== Helpers =====
function today() {
  return new Date().toLocaleDateString();
}

// Small helper: create an element with optional class and text.
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// ===== Load users =====
async function loadUsers() {
  appState.isLoading = true;
  appState.error = null;
  render();

  try {
    const response = await fetch(USERS_URL);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const users = await response.json();
    appState.users = users;
    appState.currentStudent = users[0];
    createInitialRequests(users);
  } catch (error) {
    appState.error = `Could not load data. ${error.message}`;
  } finally {
    appState.isLoading = false;
    render();
  }
}

// ===== Requests =====
function createRequest(student, documentType, purpose) {
  const request = {
    id: appState.nextRequestId,
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    documentType: documentType,
    purpose: purpose,
    stepIndex: 0,              // position in WORKFLOW_STEPS
    status: "IN_PROGRESS",     // IN_PROGRESS, ISSUED or REJECTED
    history: [{ date: today(), text: "Request submitted by student" }],
  };

  appState.nextRequestId += 1;
  appState.requests.push(request);
  return request;
}

// Initial requests shown on the dashboards.
function createInitialRequests(users) {
  appState.requests = [];
  appState.nextRequestId = 1;

  const first = createRequest(users[0], "Enrollment Certificate", "Bank");
  approveRequest(first.id);

  createRequest(users[1], "Visa Support Letter", "Visa application");

  const third = createRequest(users[2], "Transcript Request", "Scholarship");
  approveRequest(third.id);
  approveRequest(third.id);
}

function findRequest(requestId) {
  return appState.requests.find((request) => request.id === requestId);
}

// Admin approves the current step: move to the next one.
function approveRequest(requestId) {
  const request = findRequest(requestId);
  if (!request || request.status !== "IN_PROGRESS") return;

  const approvedStep = WORKFLOW_STEPS[request.stepIndex];
  request.stepIndex += 1;
  request.history.push({ date: today(), text: `${approvedStep} approved` });

  // The last step means the document is issued.
  if (request.stepIndex === WORKFLOW_STEPS.length - 1) {
    request.status = "ISSUED";
    request.history.push({ date: today(), text: "Document issued" });
  }
}

function rejectRequest(requestId) {
  const request = findRequest(requestId);
  if (!request || request.status !== "IN_PROGRESS") return;

  request.status = "REJECTED";
  request.history.push({
    date: today(),
    text: `Rejected at ${WORKFLOW_STEPS[request.stepIndex]}`,
  });
}

function getStatusLabel(request) {
  if (request.status === "REJECTED") return "Rejected";
  return WORKFLOW_STEPS[request.stepIndex];
}

// ===== Rendering =====
// render() redraws the page from appState. Call it after every change.
function render() {
  renderStatus();
  renderRoleSwitch();
  renderNav();

  const isReady = !appState.isLoading && !appState.error;
  studentView.hidden = !(isReady && appState.role === "student");
  adminView.hidden = !(isReady && appState.role === "admin");

  if (!isReady) return;

  if (appState.role === "student") {
    renderProfile();
    renderMyRequests();
  } else {
    renderAdminRequests();
  }
}

function renderStatus() {
  loadingMessage.hidden = !appState.isLoading;
  errorBox.hidden = !appState.error;
  errorMessage.textContent = appState.error || "";
}

function renderRoleSwitch() {
  for (const button of roleButtons) {
    const isActive = button.dataset.role === appState.role;
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function renderNav() {
  const links =
    appState.role === "student"
      ? [
          { href: "#request-section", text: "Request Document" },
          { href: "#my-requests", text: "My Requests" },
        ]
      : [
          { href: "#pending-requests", text: "Pending" },
          { href: "#closed-requests", text: "History" },
        ];

  navLinks.replaceChildren();
  for (const link of links) {
    const item = document.createElement("li");
    const anchor = createElement("a", "", link.text);
    anchor.href = link.href;
    item.appendChild(anchor);
    navLinks.appendChild(item);
  }
}

function renderProfile() {
  const student = appState.currentStudent;
  const rows = [
    ["Name", student.name],
    ["Student ID", `STU-${String(student.id).padStart(4, "0")}`],
    ["Email", student.email],
    ["City", student.address.city],
  ];

  profileDetails.replaceChildren();
  for (const [label, value] of rows) {
    profileDetails.append(createElement("dt", "", label), createElement("dd", "", value));
  }
}

function renderMyRequests() {
  const myRequests = appState.requests.filter(
    (request) => request.studentId === appState.currentStudent.id
  );

  myRequestList.replaceChildren();

  if (myRequests.length === 0) {
    myRequestList.appendChild(createElement("p", "empty-text", "You have no requests yet."));
    return;
  }

  // Newest first
  for (const request of [...myRequests].reverse()) {
    myRequestList.appendChild(createRequestCard(request, false));
  }
}

function renderAdminRequests() {
  const pending = appState.requests.filter((request) => request.status === "IN_PROGRESS");
  const closed = appState.requests.filter((request) => request.status !== "IN_PROGRESS");

  pendingList.replaceChildren();
  closedList.replaceChildren();

  if (pending.length === 0) {
    pendingList.appendChild(createElement("p", "empty-text", "No pending requests."));
  }
  for (const request of pending) {
    pendingList.appendChild(createRequestCard(request, true));
  }

  if (closed.length === 0) {
    closedList.appendChild(createElement("p", "empty-text", "Nothing here yet."));
  }
  for (const request of closed) {
    closedList.appendChild(createRequestCard(request, false));
  }
}

// One card is used by both dashboards. showActions adds Approve/Reject.
function createRequestCard(request, showActions) {
  const card = createElement("article", "request-card");
  if (request.status === "ISSUED") card.classList.add("is-issued");
  if (request.status === "REJECTED") card.classList.add("is-rejected");
  card.setAttribute("aria-labelledby", `request-${request.id}-title`);

  // Header: title + status badge
  const header = createElement("div", "request-card-header");
  const title = createElement("h3", "", `#${request.id} · ${request.documentType}`);
  title.id = `request-${request.id}-title`;

  let badgeClass = "badge";
  if (request.status === "ISSUED") badgeClass += " badge-issued";
  if (request.status === "REJECTED") badgeClass += " badge-rejected";
  const badge = createElement("span", badgeClass, getStatusLabel(request));

  header.append(title, badge);

  // Details: admin sees who the student is
  const metaText = appState.role === "admin"
    ? `${request.studentName} (${request.studentEmail}) · Purpose: ${request.purpose}`
    : `Purpose: ${request.purpose}`;
  const meta = createElement("p", "request-meta", metaText);

  card.append(header, meta, createProgress(request), createHistory(request));

  if (showActions) {
    card.appendChild(createAdminActions(request));
  }

  return card;
}

// Workflow progress: one list item per step.
function createProgress(request) {
  const list = createElement("ol", "progress");
  list.setAttribute("aria-label", `Progress for request #${request.id}`);

  WORKFLOW_STEPS.forEach((stepName, index) => {
    const item = createElement("li", "progress-step", stepName);
    const isIssued = request.status === "ISSUED";

    if (index < request.stepIndex || (isIssued && index === request.stepIndex)) {
      item.classList.add("is-done");
    } else if (index === request.stepIndex) {
      if (request.status === "REJECTED") {
        item.classList.add("is-rejected");
      } else {
        item.classList.add("is-current");
        item.setAttribute("aria-current", "step");
      }
    }

    list.appendChild(item);
  });

  return list;
}

// Approval history in a collapsible <details> element.
function createHistory(request) {
  const details = createElement("details", "history");
  details.appendChild(createElement("summary", "", `History (${request.history.length})`));

  const list = document.createElement("ol");
  for (const entry of request.history) {
    list.appendChild(createElement("li", "", `${entry.date} — ${entry.text}`));
  }

  details.appendChild(list);
  return details;
}

function createAdminActions(request) {
  const actions = createElement("div", "card-actions");
  const stepName = WORKFLOW_STEPS[request.stepIndex];

  const approveButton = createElement("button", "button button-approve", "Approve");
  approveButton.type = "button";
  approveButton.setAttribute("aria-label", `Approve ${stepName} for request #${request.id}`);
  approveButton.addEventListener("click", () => {
    approveRequest(request.id);
    render();
  });

  const rejectButton = createElement("button", "button button-reject", "Reject");
  rejectButton.type = "button";
  rejectButton.setAttribute("aria-label", `Reject request #${request.id}`);
  rejectButton.addEventListener("click", () => {
    rejectRequest(request.id);
    render();
  });

  actions.append(approveButton, rejectButton);
  return actions;
}

// ===== Form =====
function setFieldError(field, message) {
  document.getElementById(`${field.id}-error`).textContent = message;
  field.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateForm() {
  setFieldError(documentTypeSelect, documentTypeSelect.value ? "" : "Please select a document type.");
  setFieldError(purposeSelect, purposeSelect.value ? "" : "Please select a purpose.");
  return documentTypeSelect.value !== "" && purposeSelect.value !== "";
}

function handleSubmit(event) {
  event.preventDefault();
  formSuccess.hidden = true;

  if (!validateForm()) {
    requestForm.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  const request = createRequest(
    appState.currentStudent,
    documentTypeSelect.value,
    purposeSelect.value
  );

  requestForm.reset();
  formSuccess.textContent = `Request #${request.id} submitted. Current step: Submitted.`;
  formSuccess.hidden = false;
  render();
}

// ===== Events =====
for (const button of roleButtons) {
  button.addEventListener("click", () => {
    appState.role = button.dataset.role;
    formSuccess.hidden = true;
    render();
  });
}

requestForm.addEventListener("submit", handleSubmit);
retryButton.addEventListener("click", loadUsers);

// ===== Start =====
loadUsers();
