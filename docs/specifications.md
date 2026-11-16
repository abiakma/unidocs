# UniDocs — System Requirements Specification (SRS)

| | |
| --- | --- |
| Product | UniDocs — AHEU Certificate Management System |
| Version | 2.0 (Assignment 3) |
| Scope of this document | Problem and solution space, user personas, functional and non-functional requirements |
| Related models | [Behavioral diagrams](diagrams/behavioral/) · [Structural diagrams](diagrams/structural/) · [ERD](database-erd.md) |

Requirement keywords: **shall** = mandatory and testable; **should** = target, verified by measurement.

---

## 1. Problem space vs. solution space

### 1.1 Problem space (the situation today)

| # | Problem | Who is affected | Consequence |
| --- | --- | --- | --- |
| P1 | Students must visit the registrar, accounting and the dean's office in person to get one certificate. | Students | 2–5 working days per certificate, missed visa and job deadlines. |
| P2 | Paper approvals have no shared status: nobody knows which office holds the request. | Students, staff | Repeated phone calls and visits; lost requests. |
| P3 | Staff retype the student's faculty, course and status from Platonus by hand. | Specialists | Typing errors in official documents. |
| P4 | Employers and embassies cannot check whether a paper certificate is genuine or still valid. | Verifiers | Forged or revoked certificates are accepted. |
| P5 | There is no record of who approved, signed or revoked a document. | University management | No accountability during audits. |

### 1.2 Solution space (what UniDocs does)

| Problem | Solution in UniDocs |
| --- | --- |
| P1 | Online request form; the signed PDF is downloaded from the student dashboard. |
| P2 | Configurable approval chain with a live status (`PENDING → UNDER_REVIEW → APPROVED → AWAITING_SIGNATURE → ISSUED`) visible to the student. |
| P3 | Academic data is read live from Platonus (`StudentDataProvider`) and frozen in a snapshot on the document. |
| P4 | Each certificate carries a QR code with a random UUID v4 token; a public page shows `VALID`, `REVOKED`, `EXPIRED` or `NOT_FOUND`. |
| P5 | Append-only audit log of every login, decision, signature, download and revocation. |

### 1.3 System boundary

**In scope**

- Login through Platonus SSO (mock identity provider in development).
- Certificate requests, multi-step approval, PDF generation, digital signing, download.
- Public QR verification.
- Administration: staff accounts, roles, approval chains, revocation, audit log.
- User interface in Kazakh, Russian and English.

**Out of scope**

- Editing academic records. Platonus stays the single source of truth and UniDocs only reads from it.
- Payments for certificates.
- Paper delivery or courier services.
- Diplomas and transcripts with grades (governed by separate state regulations).
- Mobile native apps (the web app is responsive instead).

**External systems (secondary actors)**

| System | Interface in code | Development mode |
| --- | --- | --- |
| Platonus SSO | `AuthProvider` | `MockAuthProvider` with fictional identities |
| Platonus student API | `StudentDataProvider` | `MockStudentDataProvider` |
| NCALayer / NCA RK digital signature | `SigningProvider` | `MockSigningProvider` (documents marked *TEST / NOT LEGALLY SIGNED*) |

---

## 2. User personas

### Persona 1 — Aigerim, 3rd-year student (primary actor: **Student**)

- **Background:** 20 years old, International Relations, applying for a summer exchange in Germany.
- **Goal:** get a visa support letter in English within two days, without missing lectures.
- **Frustrations:** office hours clash with classes; does not know which office is holding the paper.
- **Tech level:** uses a phone for almost everything.
- **What she needs from UniDocs:** a short mobile form, a progress bar showing the current step, and a PDF she can forward to the embassy.

### Persona 2 — Dana, registrar specialist (primary actor: **Specialist**)

- **Background:** 34 years old, 8 years in the registrar's office, processes 40–60 requests a week.
- **Goal:** confirm enrollment quickly and without typing errors.
- **Frustrations:** retyping data from Platonus, students calling to ask about status.
- **What she needs:** a queue showing only requests waiting for her step, with the student's live Platonus profile next to each one.

### Persona 3 — Marat, accountant (primary actor: **Accountant**)

- **Background:** checks tuition debt before certain certificates are released.
- **Goal:** approve or reject with a short reason, in seconds.
- **What he needs:** an approve/reject button with a mandatory comment for rejections.

### Persona 4 — Prof. Saule Nurlanovna, vice-rector (primary actor: **Authorized signer**)

- **Background:** legally authorized to sign certificates on behalf of AHEU.
- **Goal:** preview the final PDF and sign it with a qualified electronic signature (NCALayer).
- **Frustrations:** signing stacks of paper; no way to check what was signed later.
- **What she needs:** a signing queue, a PDF preview, and one-click signing.

### Persona 5 — Yerlan, system administrator (primary actor: **System administrator**)

- **Background:** IT department.
- **Goal:** manage staff roles, adjust the approval chain per certificate type, revoke a certificate issued in error.
- **What he needs:** role management, an approval-chain editor with validation, and a searchable audit log.

### Persona 6 — Laura, HR manager at an employer (primary actor: **Verifier**, no account)

- **Goal:** check in under a minute that a candidate's enrollment certificate is genuine and not revoked.
- **What she needs:** scan the QR code and see the status without logging in. She must **not** see the student's personal data beyond what is printed on the paper.

---

## 3. Functional requirements

Each requirement is testable: the *Verification* column names the observable result.

### 3.1 Authentication and sessions (FR-AUTH)

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-AUTH-01 | The system **shall** authenticate users only through the configured `AuthProvider` (Platonus SSO, or the mock provider outside production) and **shall not** store user passwords. | No password column exists in the schema. `GET /api/auth/login` returns `302` to the provider. |
| FR-AUTH-02 | The system **shall** reject a login callback whose `state` parameter does not match the `state` cookie. | Callback with a wrong `state` redirects to `/login?error=state` and creates no session. |
| FR-AUTH-03 | The system **shall** create a server-side session, store only the SHA-256 hash of its token, and send the token in an `HttpOnly` cookie. | `sessions.token_hash` holds a 64-character hex hash. The cookie has the `HttpOnly` flag. |
| FR-AUTH-04 | The system **shall** expire a session after `SESSION_TTL_HOURS` (default 8 h, range 1–72) and when the user is deactivated. | A request with an expired session returns `401`. |
| FR-AUTH-05 | The system **shall** return `401 Unauthorized` for every endpoint not marked public when no valid session is present. | `GET /api/requests/my` without a cookie returns `401`. |
| FR-AUTH-06 | The system **shall** require a matching `X-CSRF-Token` header on every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) made with a session. | `POST` without the header returns `403`. |
| FR-AUTH-07 | The system **shall** enforce role-based access on the backend for every protected endpoint. | A student calling `POST /api/staff/requests/{id}/approve` gets `403`. |

### 3.2 Certificate requests (FR-REQ)

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-REQ-01 | The system **shall** allow a student to submit a request with a certificate type, a purpose, optional purpose details (≤ 200 characters) and a language (KK, RU or EN; default KK). | `POST /api/requests` returns `201` with `status = PENDING`. |
| FR-REQ-02 | The system **shall** allow `GRADUATION_CONFIRMATION` only for students with education status `GRADUATED`, and all other types only for status `ACTIVE`. | An ineligible request returns `422`. |
| FR-REQ-03 | The system **shall** limit each student to 5 requests in progress (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `AWAITING_SIGNATURE`). | The 6th request returns `409`. |
| FR-REQ-04 | The system **shall** copy the approval chain that is active at submission time into the request (`workflowSnapshot`), so later configuration changes do not affect it. | Changing the chain does not alter `workflowSnapshot` of existing requests. |
| FR-REQ-05 | The system **shall** show a student only their own requests and **shall** answer `404` for any other request ID. | Student A opening student B's request gets `404`. |
| FR-REQ-06 | The system **shall** display the current status and the completed and remaining approval steps of each request. | `GET /api/requests/{id}` returns `status`, `currentStepIndex`, steps and approvals. |

### 3.3 Approval workflow (FR-WF)

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-WF-01 | The system **shall** list for each staff member only the open requests whose current step requires one of their roles. | A specialist does not see requests waiting for the accountant. |
| FR-WF-02 | The system **shall** advance a request to the next step on approval, and set it to `APPROVED` when the last step is approved. | A 3-step chain needs exactly 3 approvals to reach `APPROVED`. |
| FR-WF-03 | The system **shall** set a request to `REJECTED` when a staff member with the current step's role rejects it, and **shall** require a rejection comment of 3–1000 characters. | Reject without a comment returns `400`. |
| FR-WF-04 | The system **shall not** allow a user to decide their own request, or to approve more than one step of the same request (separation of duties). | The second approval by the same user returns `403`. |
| FR-WF-05 | The system **shall** detect concurrent decisions on the same step and reject the later one. | Two parallel approvals: one returns `200`, the other `409`. |
| FR-WF-06 | The system **shall** let the administrator configure a default chain and per-type overrides of 1–6 steps, using only the roles `SPECIALIST`, `ACCOUNTANT` and `AUTHORIZED_SIGNER`, with `AUTHORIZED_SIGNER` as the last step. | An invalid chain returns `400`. |

### 3.4 Documents and signing (FR-DOC)

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-DOC-01 | After the final approval, the system **shall** read fresh academic data from Platonus, freeze it as `academicSnapshot`, assign a unique document number and a random UUID v4 verification token, render an unsigned preview PDF, and set the request to `AWAITING_SIGNATURE`. | A `Document` row with `status = AWAITING_SIGNATURE` exists. |
| FR-DOC-02 | If Platonus is unavailable during preparation, the system **shall** keep the request `APPROVED`, record `DOCUMENT_PREPARATION_FAILED` in the audit log, and allow a signer or administrator to retry. | `POST /api/documents/requests/{id}/prepare` succeeds after Platonus recovers. |
| FR-DOC-03 | The system **shall** allow only an `AUTHORIZED_SIGNER` with a display name and job title to sign a document in `AWAITING_SIGNATURE`. | A signer without a job title gets `409`. |
| FR-DOC-04 | On signing, the system **shall** set the document to `ISSUED`, set `issuedAt`, and set `validUntil = issuedAt + CERTIFICATE_VALIDITY_DAYS` (default 90). | Signed document has `validUntil` 90 days after `issuedAt`. |
| FR-DOC-05 | The system **shall** refuse test (mock) signing when `NODE_ENV = production`. | `POST /api/documents/{id}/sign` returns `403` in production with the mock provider. |
| FR-DOC-06 | The system **shall** render the PDF in the requested language with a QR code that links to the public verification page. | The QR payload contains `/verify/{verificationToken}`. |
| FR-DOC-07 | The system **shall** let a student download only their own `ISSUED` documents and **shall** answer `404` otherwise. | Downloading another student's document returns `404`. |
| FR-DOC-08 | The system **shall** let the administrator revoke an `ISSUED` document with a reason. | Revoking a non-issued document returns `409`. |

### 3.5 Public verification (FR-VER)

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-VER-01 | The system **shall** provide a public endpoint `GET /api/documents/verify/{token}` that requires no login. | Request without a cookie returns `200`. |
| FR-VER-02 | The system **shall** return exactly one of `VALID`, `REVOKED`, `EXPIRED`, `NOT_FOUND`, `SIGNATURE_NOT_VERIFIED`, with the order of precedence *revoked → expired → signature check*. | A revoked and expired document returns `REVOKED`. |
| FR-VER-03 | The system **shall not** return the student's name or any other personal data in the verification response. | The response schema has no personal fields. |
| FR-VER-04 | The system **shall** return `NOT_FOUND` for malformed tokens and for documents not yet signed. | `GET /verify/abc` returns `NOT_FOUND`. |
| FR-VER-05 | The system **shall** limit verification to 30 requests per minute per client. | The 31st request within a minute returns `429`. |

### 3.6 Administration and audit (FR-ADM)

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-ADM-01 | The system **shall** let the administrator create staff accounts and assign or remove roles. | `POST /api/admin/users` returns `201`. |
| FR-ADM-02 | The system **shall** let the administrator deactivate a user and **shall** end all of that user's sessions immediately. | The deactivated user's next request returns `401`. |
| FR-ADM-03 | The system **shall not** let administrators change their own account status. | Returns `403`. |
| FR-ADM-04 | The system **shall** record an audit entry (user, action, entity, IP address, time) for every login, request decision, document preparation, signature, download, revocation and configuration change. | Each listed action adds one `audit_logs` row. |
| FR-ADM-05 | The system **shall** show the audit log to the administrator with paging and filtering by action. | `GET /api/admin/audit-logs?page=2` returns the second page. |

### 3.7 User interface (FR-UI)

| ID | Requirement | Verification |
| --- | --- | --- |
| FR-UI-01 | The system **shall** provide the user interface in Kazakh, Russian and English, switchable at any time. | Switching the language changes all labels without a page reload. |
| FR-UI-02 | The system **shall** show every error to the user as a translated message, never as a raw stack trace. | A `409` response shows a toast with a readable message. |

---

## 4. Non-functional requirements

Values marked *target* are acceptance thresholds for production. They are measured with load tests and monitoring before go-live.

### 4.1 Performance (NFR-PERF)

| ID | Requirement | Measure |
| --- | --- | --- |
| NFR-PERF-01 | Read API endpoints **shall** respond within **500 ms at p95** and **1.5 s at p99** with 100 concurrent users. | k6 load test against staging. |
| NFR-PERF-02 | Document preparation and signing (PDF + QR rendering) **shall** complete within **5 s at p95**. | Server timing logs. |
| NFR-PERF-03 | The public verification endpoint **shall** respond within **300 ms at p95**. | k6 load test. |
| NFR-PERF-04 | Calls to Platonus **shall** time out after `PLATONUS_API_TIMEOUT_MS` (default **5 000 ms**) so a slow Platonus does not block the API. | Unit test of `http-client`. |
| NFR-PERF-05 | The web app's first page **shall** load in under **2.5 s Largest Contentful Paint** on a 4G mobile connection. | Lighthouse mobile audit. |

### 4.2 Availability and reliability (NFR-AVL)

| ID | Requirement | Measure |
| --- | --- | --- |
| NFR-AVL-01 | The system **shall** have **99.5 % monthly uptime** (≤ 3 h 39 min downtime per month), excluding announced maintenance windows. | External uptime monitor on `/api/health`. |
| NFR-AVL-02 | Public verification **shall** have **99.9 % monthly uptime**, because third parties rely on it. | Uptime monitor on the verify page. |
| NFR-AVL-03 | Database backups **shall** run daily. Recovery point objective (RPO) **≤ 24 h**, recovery time objective (RTO) **≤ 4 h**. | Quarterly restore drill. |
| NFR-AVL-04 | A Platonus outage **shall not** lose approved requests. They stay `APPROVED` and can be prepared later (FR-DOC-02). | Integration test with the provider returning `503`. |
| NFR-AVL-05 | Every multi-row state change (decision + approval + audit entry) **shall** run in one database transaction. | Code review of `prisma.$transaction` usage. |

### 4.3 Security and privacy (NFR-SEC)

| ID | Requirement | Measure |
| --- | --- | --- |
| NFR-SEC-01 | All traffic **shall** use HTTPS with **TLS 1.2 or newer**. Cookies **shall** be `Secure` in production. | SSL Labs grade A or better. |
| NFR-SEC-02 | Session tokens **shall** have **256 bits** of entropy and be stored only as SHA-256 hashes. | Code review of `SessionService`. |
| NFR-SEC-03 | Verification tokens **shall** be random UUID v4 (**122 bits** of entropy) and never the internal database ID. | Schema and code review. |
| NFR-SEC-04 | The API **shall** limit each client to **120 requests per minute**, login to **20 per minute** and verification to **30 per minute**. | `429` returned above the limit. |
| NFR-SEC-05 | All input **shall** be validated by DTO whitelisting. Unknown fields **shall** be rejected with `400`. | e2e tests. |
| NFR-SEC-06 | Records the user may not access **shall** return `404` (not `403`), so IDs cannot be probed. | e2e tests. |
| NFR-SEC-07 | Personal data **shall** be processed according to the Law of the Republic of Kazakhstan *On Personal Data and Their Protection* (No. 94-V). Academic data is copied only into the document snapshot. | Data-flow review. |
| NFR-SEC-08 | The API **shall** refuse to start in production while any mock provider is enabled. | `app-config.spec.ts`. |
| NFR-SEC-09 | **100 %** of state-changing actions **shall** be written to the audit log (FR-ADM-04). | Audit coverage test. |
| NFR-SEC-10 | Secrets **shall** never be committed. Configuration comes from environment variables only. | `.env` is in `.gitignore`. Secret scanning in CI. |

### 4.4 Usability and accessibility (NFR-USE)

| ID | Requirement | Measure |
| --- | --- | --- |
| NFR-USE-01 | The UI **shall** work from **360 px** (phone) to **1920 px** (desktop) width without horizontal scrolling. | Manual test on 3 viewport sizes. |
| NFR-USE-02 | The UI **should** meet **WCAG 2.1 level AA** (contrast, keyboard navigation, labels). | axe-core audit with 0 critical issues. |
| NFR-USE-03 | A student **shall** be able to submit a request in **≤ 3 screens / ≤ 1 minute**. | Usability test with 5 students. |

### 4.5 Maintainability (NFR-MNT)

| ID | Requirement | Measure |
| --- | --- | --- |
| NFR-MNT-01 | Code **shall** compile with TypeScript `strict` mode and contain no explicit `any`. | `npm run typecheck` and ESLint pass. |
| NFR-MNT-02 | Automated test coverage **should** be at least **80 %** of lines for business logic (`workflow`, `documents`, `requests`). | Coverage report in CI. |
| NFR-MNT-03 | External systems **shall** be reached only through provider interfaces (`AuthProvider`, `StudentDataProvider`, `SigningProvider`), so mock and real implementations can be swapped by configuration. | Architecture review. |
| NFR-MNT-04 | Commits **shall** follow Conventional Commits. | Commit lint. |

---

## 5. Traceability

| Use case ([diagram](diagrams/behavioral/use-case-diagram.md)) | Functional requirements | Other models |
| --- | --- | --- |
| UC-01 Log in | FR-AUTH-01…07 | [Session state machine](diagrams/behavioral/state-machine-diagram.md#3-session-lifecycle) |
| UC-03 Submit certificate request | FR-REQ-01…04 | [Activity diagram](diagrams/behavioral/activity-diagram.md) |
| UC-04 Track request status | FR-REQ-05, FR-REQ-06 | [Request state machine](diagrams/behavioral/state-machine-diagram.md#1-certificate-request-lifecycle) |
| UC-06 Approve workflow step | FR-WF-01, 02, 04, 05 | [Sequence diagram 1](diagrams/structural/sequence-diagram.md#1-approve-the-current-workflow-step) |
| UC-07 Reject request | FR-WF-03, 04 | [Request state machine](diagrams/behavioral/state-machine-diagram.md#1-certificate-request-lifecycle) |
| UC-08 Prepare document | FR-DOC-01, 02 | [Sequence diagram 1](diagrams/structural/sequence-diagram.md#1-approve-the-current-workflow-step) |
| UC-09 Sign certificate | FR-DOC-03…06 | [Document state machine](diagrams/behavioral/state-machine-diagram.md#2-document-lifecycle) |
| UC-10 Download certificate | FR-DOC-07 | [Class diagram](diagrams/structural/class-diagram.md) |
| UC-11 Verify certificate | FR-VER-01…05 | [Sequence diagram 2](diagrams/structural/sequence-diagram.md#2-public-qr-verification) |
| UC-12 Revoke certificate | FR-DOC-08 | [Document state machine](diagrams/behavioral/state-machine-diagram.md#2-document-lifecycle) |
| UC-13 Configure approval chain | FR-WF-06 | [CRC cards](diagrams/structural/crc-cards.md) |
| UC-14 Manage staff and roles | FR-ADM-01…03 | [CRC cards](diagrams/structural/crc-cards.md) |
| UC-15 View audit log | FR-ADM-04, 05 | [Class diagram](diagrams/structural/class-diagram.md) |
