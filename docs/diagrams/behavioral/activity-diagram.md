# Activity Diagrams (with swimlanes)

Each diagram has three vertical swimlanes:

| Lane | What runs there |
| --- | --- |
| **Client UI** | React app in the browser (`apps/web`) |
| **API Gateway** | Express/NestJS middleware and global guards: Helmet, rate limiter, `SessionGuard`, `CsrfGuard`, `RolesGuard`, `ValidationPipe` |
| **Backend / Database** | Services (`RequestsService`, `DocumentsService`, …), PostgreSQL via Prisma, Platonus provider |

Rounded nodes are actions, diamonds are decisions with guards in `[ ]`, the filled circle is the start and the bullseye is the end.

## 1. Submit a certificate request

Use case UC-02. Requirements FR-REQ-01 … FR-REQ-06.

```mermaid
flowchart TB
  subgraph UI["Client UI (React)"]
    S((●)) --> U1(Open New request form)
    U1 --> U2(Fill type, purpose,<br/>language, details)
    U2 --> U3{All required<br/>fields filled?}
    U3 -- "[no]" --> U4(Show field error) --> U2
    U3 -- "[yes]" --> U5(POST /api/requests<br/>+ X-CSRF-Token)
    U6(Show error message)
    U7(Show request with<br/>workflow stepper)
    U7 --> E((◉))
    U6 --> U2
  end

  subgraph GW["API Gateway (guards)"]
    G1{Rate limit<br/>exceeded?}
    G1 -- "[no]" --> G2{Valid session<br/>cookie?}
    G2 -- "[yes]" --> G3{CSRF token<br/>matches?}
    G3 -- "[yes]" --> G4{Role is<br/>STUDENT?}
    G4 -- "[yes]" --> G5{Body valid,<br/>no unknown fields?}
  end

  subgraph BE["Backend / Database"]
    B1(Read education status<br/>from Platonus)
    B1 --> B2{Status allows<br/>certificate type?}
    B2 -- "[yes]" --> B3(Count requests<br/>in progress)
    B3 --> B4{count < 5?}
    B4 -- "[yes]" --> B5(Load approval chain<br/>for type)
    B5 --> B6(BEGIN transaction)
    B6 --> B7(INSERT request<br/>status = PENDING, step 0,<br/>workflow snapshot)
    B7 --> B8(INSERT audit log<br/>request.created)
    B8 --> B9(COMMIT, return 201)
  end

  U5 --> G1
  G1 -- "[yes] 429" --> U6
  G2 -- "[no] 401" --> U6
  G3 -- "[no] 403" --> U6
  G4 -- "[no] 403" --> U6
  G5 -- "[no] 400" --> U6
  G5 -- "[yes]" --> B1
  B2 -- "[no] 422" --> U6
  B4 -- "[no] 409" --> U6
  B9 --> U7
```

## 2. Approve, sign and issue

Use cases UC-05 and UC-06. Requirements FR-WF-02 … FR-WF-06, FR-DOC-01 … FR-DOC-04. Gateway checks (rate limit, session, CSRF, role) are the same as in diagram 1 and are collapsed into one node.

```mermaid
flowchart TB
  subgraph UI["Client UI (React)"]
    S((●)) --> U1(Staff opens request<br/>from own queue)
    U1 --> U2{Decision?}
    U2 -- "[approve]" --> U3(POST …/approve)
    U2 -- "[reject]" --> U4(Enter reason 3–1000 chars)
    U4 --> U5(POST …/reject)
    U6(Show 403 / 409 message,<br/>reload queue)
    U7(Signer opens<br/>signing queue)
    U7 --> U8(Preview PDF,<br/>click Sign)
    U8 --> U9(POST /documents/:id/sign)
    U10(Show ISSUED<br/>+ verification link)
    U11(Student sees REJECTED<br/>with reason)
    U12(Request moves to<br/>next role's queue)
    U10 --> E((◉))
    U11 --> E
    U12 --> E
  end

  subgraph GW["API Gateway (guards)"]
    G1{Session, CSRF<br/>and staff role OK?}
    G2{Session, CSRF and<br/>AUTHORIZED_SIGNER?}
  end

  subgraph BE["Backend / Database"]
    B1(BEGIN transaction,<br/>load request + approvals)
    B1 --> B2{Role of current step,<br/>not own request,<br/>no earlier approval?}
    B2 -- "[yes]" --> B3(UPDATE … WHERE status<br/>and step unchanged)
    B3 --> B4{1 row updated?}
    B4 -- "[yes]" --> B5(INSERT approval<br/>+ audit, COMMIT)
    B5 --> B6{Decision was<br/>reject?}
    B6 -- "[no]" --> B7{Last step?}
    B7 -- "[yes]" --> B8(Read live profile,<br/>render PDF + QR,<br/>status AWAITING_SIGNATURE)
    B8 --> B9{Preparation<br/>succeeded?}
    B9 -- "[no]" --> B10(Keep APPROVED,<br/>audit failure,<br/>allow retry)
    S1(Render final PDF,<br/>SigningProvider.sign)
    S1 --> S2{Signature<br/>accepted?}
    S2 -- "[yes]" --> S3(UPDATE document WHERE<br/>AWAITING_SIGNATURE → ISSUED,<br/>request → ISSUED, audit)
  end

  U3 --> G1
  U5 --> G1
  G1 -- "[no] 401/403" --> U6
  G1 -- "[yes]" --> B1
  B2 -- "[no] 403" --> U6
  B4 -- "[no] 409" --> U6
  B6 -- "[yes] REJECTED" --> U11
  B7 -- "[no] UNDER_REVIEW" --> U12
  B9 -- "[yes]" --> U7
  B10 --> U7
  U9 --> G2
  G2 -- "[no] 401/403" --> U6
  G2 -- "[yes]" --> S1
  S2 -- "[no] 409" --> U6
  S3 --> U10
```
