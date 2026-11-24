# UML Sequence Diagrams — UniDocs

Messages are in chronological order from top to bottom. Solid arrows (`->>`) are calls or HTTP requests, dashed arrows (`-->>`) are responses. `alt` / `else` frames show the success path and every error path with its HTTP status. `opt` frames show optional steps. `critical` marks a database transaction.

Participants map to classes in the [class diagram](class-diagram.md).

## 1. Approve the current workflow step

Use cases: [UC-06](../behavioral/use-case-diagram.md#uc-06-approve-workflow-step) and, when the last step is approved, [UC-08](../behavioral/use-case-diagram.md#uc-08-prepare-document). Requirements: FR-AUTH-05…07, FR-WF-02, FR-WF-04, FR-WF-05, FR-DOC-01, FR-DOC-02.

```mermaid
sequenceDiagram
  autonumber
  actor Staff as Staff member
  participant SPA as React SPA
  participant GW as Gateway<br/>(Throttler, Session, CSRF, Roles guards)
  participant SC as StaffController
  participant RS as RequestsService
  participant WR as WorkflowRules
  participant DB as PostgreSQL<br/>(Prisma)
  participant DS as DocumentsService
  participant PL as Platonus API

  Staff->>SPA: Click "Approve" (optional comment)
  SPA->>GW: POST /api/staff/requests/{id}/approve<br/>Cookie: unidocs_sid, X-CSRF-Token, body {comment}

  alt more than 120 requests per minute
    GW-->>SPA: 429 Too Many Requests
  else no valid session
    GW-->>SPA: 401 Unauthorized
  else CSRF token missing or wrong
    GW-->>SPA: 403 Invalid or missing CSRF token
  else role is not SPECIALIST, ACCOUNTANT or AUTHORIZED_SIGNER
    GW-->>SPA: 403 Forbidden
  else id is not a UUID v4 or comment is invalid
    GW-->>SPA: 400 Bad Request
  else request passes the gateway
    GW->>SC: approve(id, body, user, req)
    SC->>RS: approve(id, user, comment, ip)

    critical one database transaction
      RS->>DB: SELECT request WITH approvals WHERE id
      DB-->>RS: request or null
      alt request not found
        RS-->>SC: throw NotFoundException
        SC-->>GW: 404 Request not found
        GW-->>SPA: 404
      else request found
        RS->>WR: checkCanDecide(state, actor, previousApproverIds)
        WR-->>RS: DecisionCheck
        alt not allowed (not open, wrong role, own request, already approved a step)
          RS-->>SC: throw ForbiddenException(reason)
          SC-->>GW: 403 + reason
          GW-->>SPA: 403
        else allowed
          RS->>WR: stateAfterApproval(steps, currentStepIndex)
          WR-->>RS: next status and step index
          RS->>DB: UPDATE request SET next WHERE id AND status AND currentStepIndex unchanged
          DB-->>RS: count
          alt count is not 1 (someone decided first)
            RS-->>SC: throw ConflictException
            SC-->>GW: 409 Changed by someone else
            GW-->>SPA: 409
          else updated
            RS->>DB: INSERT approval (APPROVED)
            RS->>DB: INSERT audit_log REQUEST_APPROVED
            DB-->>RS: COMMIT
          end
        end
      end
    end

    opt new status is APPROVED (the last step was approved)
      RS->>DS: prepareForSigning(requestId, actorId, ip)
      DS->>PL: GET student profile by external ID (timeout 5 s)
      alt Platonus returns the profile and the student is still eligible
        PL-->>DS: 200 StudentAcademicProfile
        DS->>DS: freeze snapshot, next document number,<br/>random UUID v4 token, render preview PDF + QR
        DS->>DB: UPDATE request SET AWAITING_SIGNATURE<br/>INSERT document, INSERT audit_log (one transaction)
        DB-->>DS: COMMIT
        DS-->>RS: documentId
      else Platonus unavailable, timeout, or student no longer eligible
        PL-->>DS: 503 / timeout / not eligible
        DS-->>RS: throw error
        RS->>DB: INSERT audit_log DOCUMENT_PREPARATION_FAILED
        Note over RS,DB: Request stays APPROVED. The signer can retry with<br/>POST /api/documents/requests/{id}/prepare
      end
    end

    RS->>DB: SELECT updated request
    DB-->>RS: request
    RS-->>SC: RequestView
    SC-->>GW: 200 OK + RequestView
    GW-->>SPA: 200 OK
    SPA-->>Staff: Show toast and the updated progress bar
  end

  opt any error response
    SPA-->>Staff: Show the translated error message
  end
```

What this shows:

- **Gateway errors** (`429`, `401`, `403`, `400`) are returned before any business code runs.
- **Business errors** (`404`, `403`, `409`) are raised inside the transaction, so nothing is written when they happen.
- **A Platonus failure does not fail the approval.** The approval is already committed and the response is still `200`. Only document preparation is postponed (NFR-AVL-04).

## 2. Public QR verification

Use case: [UC-11](../behavioral/use-case-diagram.md#uc-11-verify-certificate). Requirements: FR-VER-01…05.

```mermaid
sequenceDiagram
  autonumber
  actor V as Verifier
  participant Web as Verify page (SPA)
  participant GW as Gateway<br/>(Throttler, SessionGuard)
  participant DC as DocumentsController
  participant DS as DocumentsService
  participant VR as VerificationRules
  participant DB as PostgreSQL
  participant SP as SigningProvider
  participant FS as StorageService

  V->>Web: Scan QR code, open /verify/{token}
  Web->>GW: GET /api/documents/verify/{token} (no cookie)

  alt more than 30 checks per minute from this client
    GW-->>Web: 429 Too Many Requests
    Web-->>V: "Too many checks, try again in a minute"
  else allowed (route is @Public, no session needed)
    GW->>DC: verify(token)
    DC->>DS: verify(token.slice(0, 64))
    DS->>VR: isVerificationTokenFormat(token)
    VR-->>DS: boolean

    alt token is not a UUID v4
      DS-->>DC: {status: NOT_FOUND, document: null}
    else valid format
      DS->>DB: SELECT document WHERE verificationToken WITH latest signature
      DB-->>DS: document or null
      alt no document, or document not signed yet
        DS-->>DC: {status: NOT_FOUND, document: null}
      else signed document found
        alt signature stored as INVALID or provider unknown
          DS->>DS: signatureCheck = NOT_VERIFIED
        else signature stored as MOCK_TEST_ONLY
          DS->>DS: signatureCheck = TEST_ONLY
        else signature stored as VALID
          DS->>FS: read(signedFilePath)
          FS-->>DS: signed PDF bytes
          DS->>SP: verify(signatureStatus, signedPdf, certificateSerial)
          alt cryptographic check succeeds
            SP-->>DS: VERIFIED
          else check fails or throws
            SP-->>DS: NOT_VERIFIED
          end
        end
        DS->>VR: computeVerificationStatus(documentStatus, validUntil, signatureCheck, now)
        VR-->>DS: REVOKED, EXPIRED, VALID or SIGNATURE_NOT_VERIFIED
        DS-->>DC: {status, document: number, type, dates, signer job title, isTest}
      end
    end

    DC-->>GW: 200 OK (Cache-Control: no-store)
    GW-->>Web: 200 OK + VerificationResult
    Web-->>V: Status badge, document details, TEST warning if isTest
  end
```

What this shows:

- The endpoint **always answers `200`** with a status, except for rate limiting. An unknown token is a normal `NOT_FOUND` result, not an HTTP error, so probing tokens gives no extra information.
- The order of the checks in `computeVerificationStatus` gives the precedence **revoked → expired → signature** (FR-VER-02).
- The response contains **no student personal data** (FR-VER-03).
