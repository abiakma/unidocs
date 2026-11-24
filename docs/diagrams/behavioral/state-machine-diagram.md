# State Machine Diagrams — UniDocs

Requirements: FR-AUTH-03…04, FR-REQ, FR-WF, FR-DOC, FR-VER. The states are the real enum values in [`schema.prisma`](../../../apps/api/prisma/schema.prisma). The transition rules are in [`workflow-rules.ts`](../../../apps/api/src/workflow/workflow-rules.ts), [`documents.service.ts`](../../../apps/api/src/documents/documents.service.ts) and [`session.service.ts`](../../../apps/api/src/auth/session.service.ts).

Transition labels use UML syntax: **`event [guard] / action`**. A transition fires only when its guard is true. Every state-changing update is a conditional `UPDATE … WHERE status = <expected>`, so if two users act at the same time only one transition succeeds and the other gets `409`.

## 1. Certificate request lifecycle

Entity: `CertificateRequest.status` (`RequestStatus`).

```mermaid
stateDiagram-v2
  direction TB
  [*] --> PENDING : submit [eligible AND open requests below 5] / copy workflow snapshot, currentStepIndex = 0

  state "Open (waiting for a decision)" as Open {
    PENDING
    UNDER_REVIEW
  }

  PENDING --> UNDER_REVIEW : approve [canDecide AND current step is not the last] / currentStepIndex + 1
  UNDER_REVIEW --> UNDER_REVIEW : approve [canDecide AND current step is not the last] / currentStepIndex + 1
  PENDING --> APPROVED : approve [canDecide AND current step is the last] / currentStepIndex = steps.length
  UNDER_REVIEW --> APPROVED : approve [canDecide AND current step is the last]
  PENDING --> REJECTED : reject [canReject AND comment 3..1000 chars]
  UNDER_REVIEW --> REJECTED : reject [canReject AND comment 3..1000 chars]

  APPROVED --> AWAITING_SIGNATURE : prepare [Platonus reachable AND student still eligible] / create Document
  APPROVED --> APPROVED : prepare [Platonus unavailable OR not eligible] / audit DOCUMENT_PREPARATION_FAILED
  AWAITING_SIGNATURE --> ISSUED : document signed [Document.status = AWAITING_SIGNATURE]

  REJECTED --> [*]
  ISSUED --> [*]
```

### Guards

| Guard | Exact condition (from `checkCanDecide`) |
| --- | --- |
| `canDecide` | status is `PENDING` or `UNDER_REVIEW` **and** the actor is not the requesting student **and** the actor has the role of `steps[currentStepIndex]` **and** the actor has not approved any earlier step of this request (separation of duties). |
| `canReject` | Same as `canDecide` except the separation-of-duties rule. |
| *current step is the last* | `currentStepIndex + 1 ≥ steps.length` (see `stateAfterApproval`). |
| *eligible* | `GRADUATION_CONFIRMATION` → education status `GRADUATED`. Any other type → `ACTIVE`. |

### State table

| State | Meaning | Who acts next | Final? |
| --- | --- | --- | --- |
| `PENDING` | Submitted. First step not decided yet. | Role of step 0 | No |
| `UNDER_REVIEW` | At least one step approved, more remain. | Role of the current step | No |
| `APPROVED` | All steps approved, PDF not prepared yet. | System, or a signer/admin retry | No |
| `AWAITING_SIGNATURE` | Preview PDF ready in the signer's queue. | Authorized signer | No |
| `ISSUED` | Signed. Student can download. | — | Yes |
| `REJECTED` | Rejected at some step, with a reason. | — | Yes |

> A rejected request is not reopened. The student submits a new one.

## 2. Document lifecycle

Entity: `Document.status` (`DocumentStatus`). `EXPIRED` is **not stored**: it is derived at verification time from `validUntil`, so it is drawn as a sub-state of `ISSUED`.

```mermaid
stateDiagram-v2
  direction TB
  [*] --> AWAITING_SIGNATURE : prepareForSigning [request APPROVED AND no document yet] / assign documentNumber, UUID v4 token, render preview PDF

  AWAITING_SIGNATURE --> ISSUED : sign [actor is AUTHORIZED_SIGNER AND signer has name and job title AND provider allowed in this environment] / render final PDF, store signature, issuedAt = now, validUntil = now + 90 days

  state ISSUED {
    direction LR
    [*] --> Valid
    Valid --> Expired : time passes [now > validUntil]
  }

  ISSUED --> REVOKED : revoke [actor is SYSTEM_ADMIN AND reason given] / revokedAt = now, revokedBy = actor
  REVOKED --> [*]
```

### What a verifier sees in each state

| Document state | `GET /api/documents/verify/{token}` returns |
| --- | --- |
| `AWAITING_SIGNATURE` | `NOT_FOUND` (unsigned documents are invisible to the public) |
| `ISSUED` › Valid, signature verified | `VALID` |
| `ISSUED` › Valid, signature not verified or test signature | `SIGNATURE_NOT_VERIFIED` |
| `ISSUED` › Expired | `EXPIRED` |
| `REVOKED` | `REVOKED` (wins over `EXPIRED`) |

## 3. Session lifecycle

Entity: `Session` row + `unidocs_sid` cookie.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> LoginStarted : GET /auth/login / set state cookie (10 min)
  LoginStarted --> Active : callback [state matches AND identity resolved AND user active] / store SHA-256(token), set HttpOnly cookie, expiresAt = now + 8 h
  LoginStarted --> [*] : callback [state mismatch OR provider error OR account denied] / audit LOGIN_FAILED

  Active --> Active : any request [expiresAt > now AND user active] / refresh lastSeenAt
  Active --> Ended : request [expiresAt ≤ now OR user deactivated] / delete session row, return 401
  Active --> Ended : POST /auth/logout [valid CSRF token] / delete session row, clear cookie
  Active --> Ended : admin deactivates user / delete all sessions of the user
  Ended --> [*]
```

| Guard | Where it is checked |
| --- | --- |
| *state matches* | `AuthController.callback` with constant-time comparison |
| *expiresAt > now AND user active* | `SessionService.resolve`, called by `SessionGuard` on every request |
| *valid CSRF token* | `CsrfGuard` for every state-changing method |
