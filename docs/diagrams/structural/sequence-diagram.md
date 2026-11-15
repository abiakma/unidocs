# UML Sequence Diagrams

Chronological HTTP messaging between the browser, the API layers and the database. Solid arrows are calls, dashed arrows are replies. `alt` / `else` frames are mutually exclusive error paths, `opt` frames run only when their guard holds. All three flows run through the same global guard chain; diagram 1 shows it in full, diagrams 2 and 3 collapse it.

Participants:

| Participant | Code |
| --- | --- |
| UI | React page in `apps/web` + `api` client |
| Gateway | Helmet, `ThrottlerGuard`, `SessionGuard`, `CsrfGuard`, `RolesGuard`, `ValidationPipe` |
| Controller | `RequestsController`, `StaffController`, `DocumentsController` |
| Service | `RequestsService`, `DocumentsService` |
| Platonus | `StudentDataProvider` |
| DB | PostgreSQL via Prisma |

## 1. `POST /api/requests` — submit a request

Use case UC-02. Requirements FR-AUTH-07/08, FR-REQ-01 … FR-REQ-06.

```mermaid
sequenceDiagram
  autonumber
  actor S as Student
  participant UI as React UI
  participant GW as Gateway (guards + pipes)
  participant C as RequestsController
  participant RS as RequestsService
  participant P as StudentDataProvider
  participant DB as PostgreSQL

  S->>UI: Fill form, click Submit
  UI->>UI: Check required fields
  UI->>GW: POST /api/requests {certificateType, purpose, language}<br/>Cookie: unidocs_sid, X-CSRF-Token
  activate GW
  GW->>GW: ThrottlerGuard (120/min per IP)
  alt rate limit exceeded
    GW-->>UI: 429 Too Many Requests
  else no or expired session
    GW->>DB: SELECT session WHERE token_hash = sha256(cookie)
    DB-->>GW: none / expired
    GW-->>UI: 401 Unauthorized
  else CSRF header missing or wrong
    GW-->>UI: 403 Forbidden
  else role is not STUDENT
    GW-->>UI: 403 Forbidden
  else body invalid or has unknown fields
    GW-->>UI: 400 Bad Request {message[]}
  else all checks pass
    GW->>C: create(dto, user, ip)
    deactivate GW
    activate C
    C->>RS: create(user, dto, ip)
    activate RS
    RS->>P: getStudentAcademicStatus(externalUserId)
    alt Platonus unavailable
      P-->>RS: throws ServiceUnavailableException
      RS-->>C: propagates
      C-->>UI: 503 Service Unavailable
    else student not found
      P-->>RS: null
      RS-->>C: ForbiddenException
      C-->>UI: 403 Forbidden
    else status does not allow type
      P-->>RS: {educationStatus: ACADEMIC_LEAVE}
      RS-->>C: UnprocessableEntityException
      C-->>UI: 422 Unprocessable Entity
    else eligible
      P-->>RS: {educationStatus: ACTIVE}
      RS->>DB: COUNT requests WHERE student AND status IN (open)
      DB-->>RS: n
      alt n ≥ 5
        RS-->>C: ConflictException
        C-->>UI: 409 Conflict
      else n < 5
        RS->>DB: SELECT workflow_steps for type (or default)
        DB-->>RS: steps[]
        RS->>DB: BEGIN
        RS->>DB: INSERT certificate_requests (PENDING, step 0, snapshot)
        RS->>DB: INSERT audit_logs (request.created)
        RS->>DB: COMMIT
        RS-->>C: RequestView
        deactivate RS
        C-->>UI: 201 Created {id, status: PENDING, steps}
        deactivate C
        UI-->>S: Show request with workflow stepper
      end
    end
  end
```

## 2. `POST /api/staff/requests/:id/approve` — approve a step

Use case UC-05. Requirements FR-WF-02 … FR-WF-06, FR-DOC-01, FR-DOC-02.

```mermaid
sequenceDiagram
  autonumber
  actor A as Accountant
  participant UI as React UI
  participant GW as Gateway
  participant C as StaffController
  participant RS as RequestsService
  participant WR as WorkflowRules
  participant DS as DocumentsService
  participant DB as PostgreSQL

  A->>UI: Click Approve (optional comment)
  UI->>GW: POST /api/staff/requests/{id}/approve {comment}
  alt guards fail (session / CSRF / staff role / UUID)
    GW-->>UI: 401 / 403 / 400
  else guards pass
    GW->>C: approve(id, dto, user)
    C->>RS: approve(id, user, comment, ip)
    activate RS
    RS->>DB: BEGIN
    RS->>DB: SELECT request + approvals WHERE id
    alt request not found
      DB-->>RS: null
      RS->>DB: ROLLBACK
      RS-->>UI: 404 Not Found
    else found
      DB-->>RS: request {status, currentStepIndex, snapshot, approvals}
      RS->>WR: checkCanDecide(request, actor, previousApproverIds)
      alt not allowed (NOT_ACTIONABLE / WRONG_ROLE / OWN_REQUEST / ALREADY_DECIDED_BY_USER)
        WR-->>RS: {allowed: false, reason}
        RS->>DB: ROLLBACK
        RS-->>UI: 403 Forbidden {reason}
      else allowed
        WR-->>RS: {allowed: true, step}
        RS->>WR: stateAfterApproval(steps, currentStepIndex)
        WR-->>RS: {status, currentStepIndex}
        RS->>DB: UPDATE request SET next state<br/>WHERE id AND status AND step unchanged
        alt 0 rows updated (another user decided first)
          DB-->>RS: count = 0
          RS->>DB: ROLLBACK
          RS-->>UI: 409 Conflict "reload and try again"
        else 1 row updated
          DB-->>RS: count = 1
          RS->>DB: INSERT approvals (APPROVED, step)
          RS->>DB: INSERT audit_logs (request.approved)
          RS->>DB: COMMIT
          opt new status = APPROVED (last step)
            RS->>DS: prepareForSigning(id, actorId, ip)
            alt Platonus down or student no longer eligible
              DS-->>RS: throws
              RS->>DB: INSERT audit_logs (document.preparation_failed)
              Note over RS: Request stays APPROVED,<br/>signer can retry
            else prepared
              DS->>DB: UPDATE request → AWAITING_SIGNATURE,<br/>INSERT documents (number, token)
              DS-->>RS: documentId
            end
          end
          RS-->>C: RequestView
          deactivate RS
          C-->>UI: 200 OK {status: UNDER_REVIEW | APPROVED | AWAITING_SIGNATURE}
          UI-->>A: Remove from queue, show toast
        end
      end
    end
  end
```

## 3. `GET /api/documents/verify/:token` — public verification

Use case UC-07. Requirements FR-VER-01 … FR-VER-05.

```mermaid
sequenceDiagram
  autonumber
  actor V as Verifier
  participant UI as Verify page
  participant GW as Gateway
  participant C as DocumentsController
  participant DS as DocumentsService
  participant SP as SigningProvider
  participant DB as PostgreSQL

  V->>UI: Scan QR → open /verify/{token}
  UI->>GW: GET /api/documents/verify/{token} (no cookie needed)
  alt more than 30 requests/min from this IP
    GW-->>UI: 429 Too Many Requests
    UI-->>V: "Too many checks, try again later"
  else within limit (@Public route)
    GW->>C: verify(token)
    C->>DS: verify(token)
    alt token is not a UUID v4
      DS-->>UI: 200 {status: NOT_FOUND}
    else well-formed
      DS->>DB: SELECT document + request + latest signature WHERE verification_token
      alt no document or no signature yet
        DB-->>DS: null
        DS-->>UI: 200 {status: NOT_FOUND, document: null}
      else signed document found
        DB-->>DS: document, signature
        DS->>SP: verify(signedPdf, signatureStatus, certificateSerial)<br/>(provider that created the signature)
        SP-->>DS: VERIFIED | NOT_VERIFIED | TEST_ONLY
        DS->>DS: computeVerificationStatus(status, validUntil, signatureCheck, now)
        alt document still AWAITING_SIGNATURE
          DS-->>UI: 200 {status: NOT_FOUND}
        else REVOKED
          DS-->>UI: 200 {status: REVOKED, document {revokedAt, …}}
        else ISSUED and now > validUntil
          DS-->>UI: 200 {status: EXPIRED, document {validUntil, …}}
        else ISSUED and signatureCheck = VERIFIED
          DS-->>UI: 200 {status: VALID, document {signatureCheck: VERIFIED}}
        else ISSUED, TEST_ONLY or NOT_VERIFIED (all mock-signed documents)
          DS-->>UI: 200 {status: SIGNATURE_NOT_VERIFIED, document {isTestDocument: true}}
        end
      end
    end
    UI-->>V: Number, type, dates, signer designation, status<br/>(no student name, IIN or grades)
  end
```
