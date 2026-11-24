# CRC Cards — UniDocs backend

CRC = **C**lass, **R**esponsibilities, **C**ollaborators. One card per class in [`apps/api/src`](../../../apps/api/src). Each card also names the class's **single reason to change**, to show that it follows the Single Responsibility Principle (SRP). The same classes appear with full signatures in the [class diagram](class-diagram.md).

Layers: **Entity** (persistent data, Prisma model) · **Rule** (pure logic, no I/O) · **Service** (use-case logic) · **Gateway** (request pipeline) · **Provider** (adapter to an external system) · **Infrastructure**.

## Domain entities

| **CertificateRequest** — Entity | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Know the requested type, purpose, language and student | User |
| Know its status and current step index | WorkflowRules |
| Keep the frozen copy of the approval chain (`workflowSnapshot`) | WorkflowStep |
| Own its decisions | Approval |
| Point to the document produced from it | Document |
| *Single reason to change:* the data a student submits | |

| **Approval** — Entity | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Record one decision (approve/reject) for one step of one request | CertificateRequest |
| Record who decided, in which role, with which comment and when | User |
| *Single reason to change:* what is recorded about a decision | |

| **Document** — Entity | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Know its number, verification token, status and validity period | CertificateRequest |
| Keep the frozen academic snapshot used to print it | DocumentSignature |
| Know if and why it was revoked | User (revoker) |
| *Single reason to change:* the lifecycle data of an issued certificate | |

| **DocumentSignature** — Entity | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Record which provider signed which document, by whom, with which certificate serial | Document, User |
| Point to the signed PDF file | StorageService |
| *Single reason to change:* signature evidence format | |

| **Session** — Entity | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Know the hashed token, CSRF token, owner and expiry of one login | User |
| *Single reason to change:* session data model | |

| **AuditLog** — Entity | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Store one immutable record of who did what to which entity, from which IP, when | User |
| *Single reason to change:* audit record format | |

## Business rules

| **WorkflowRules** (`workflow-rules.ts`) — Rule, pure functions | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Validate an approval chain (1–6 steps, approver roles only, signer last) | WorkflowStepSnapshot |
| Decide whether an actor may decide the current step (role, own request, separation of duties) | WorkflowActor, WorkflowRequestState |
| Compute the next status and step index after an approval | — |
| *Single reason to change:* university approval policy | |

| **VerificationRules** (`verification.ts`) — Rule, pure functions | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Check the verification-token format | — |
| Compute the public status with precedence revoked → expired → signature | SignatureCheck |
| *Single reason to change:* public verification policy | |

## Services

| **RequestsService** — Service | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Create a request after the eligibility and open-request-limit checks | StudentDataProvider, WorkflowService |
| List and show requests with ownership checks | PrismaService |
| Apply approve/reject decisions atomically | WorkflowRules, AuditService |
| Start document preparation after the last approval | DocumentsService |
| *Single reason to change:* the request use cases | |

| **WorkflowService** — Service | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Pick the chain for a certificate type (override, else default) | PrismaService |
| Read and replace chain configuration | WorkflowRules, AuditService |
| *Single reason to change:* how chains are stored and configured | |

| **DocumentsService** — Service | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Prepare a document: snapshot data, number, token, preview PDF | StudentDataProvider, CertificatePdf, StorageService |
| Sign a document and store the signature | SigningProvider, StorageService |
| Serve downloads with ownership checks | PrismaService |
| Verify a token for the public page | VerificationRules, SigningProvider |
| Revoke an issued document | AuditService |
| *Single reason to change:* the document lifecycle | |

> **SRP note.** `DocumentsService` is the widest card. All its responsibilities change for one reason (the document lifecycle), and the parts that change for other reasons are already delegated: PDF layout to `CertificatePdf`, verification policy to `VerificationRules`, cryptography to `SigningProvider`, files to `StorageService`. If verification grows (for example bulk checks for embassies), it should become its own `VerificationService`.

| **AdminService** — Service | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Create staff users and change their roles and status | PrismaService, SessionService |
| Page and filter the audit log | AuditLog |
| Show non-secret system configuration | AppConfig |
| *Single reason to change:* administration use cases | |

| **AuthService** — Service | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Map a verified external identity to a UniDocs user | AuthProvider, PrismaService |
| Provision a student account on first login | StudentDataProvider, AuditService |
| Refuse deactivated users and unprovisioned staff | — |
| *Single reason to change:* identity-to-account policy | |

| **SessionService** — Service | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Create a session with random token and CSRF token, store only the hash | PrismaService |
| Resolve a cookie token to an `AuthContext`, expire old sessions | Session, User |
| Destroy one or all sessions of a user | — |
| *Single reason to change:* session mechanics | |

| **AuditService** — Service | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Append an audit entry, inside the caller's transaction when given | PrismaService, AuditLog |
| *Single reason to change:* how audit entries are written | |

## Gateway (request pipeline)

| **SessionGuard** — Gateway | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Load the session from the cookie, allow only `@Public()` routes without one | SessionService, Reflector |
| *Single reason to change:* authentication rules | |

| **CsrfGuard** — Gateway | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Compare the `X-CSRF-Token` header with the session's token on state-changing methods | AuthContext |
| *Single reason to change:* CSRF policy | |

| **RolesGuard** — Gateway | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Allow a route only for the roles declared with `@Roles()` | Reflector, AuthContext |
| *Single reason to change:* role-based access policy | |

| **AppExceptionFilter** — Gateway | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Turn known database errors into `409`/`404` and hide unknown errors behind `500` | Prisma errors, Logger |
| *Single reason to change:* error-response format | |

## Providers (adapters to external systems)

| **StudentDataProvider** «interface» — Provider | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Return a student's academic profile and education status, read-only | Platonus API (`PlatonusStudentDataProvider`) or `MockStudentDataProvider` |
| *Single reason to change:* the academic-data contract | |

| **SigningProvider** «interface» — Provider | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Sign a PDF and report signature status | NCALayer / NCA RK (`OfficialSigningProvider`) or `MockSigningProvider` |
| Verify a stored signature | — |
| *Single reason to change:* the signing technology | |

| **AuthProvider** «interface» — Provider | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Build the login redirect URL and turn a callback code into an `ExternalIdentity` | Platonus SSO (`PlatonusSsoProvider`) or `MockAuthProvider` |
| *Single reason to change:* the identity-provider protocol | |

## Infrastructure

| **StorageService** — Infrastructure | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Save and read PDFs only inside `STORAGE_DIR` (no path traversal) | AppConfig, file system |
| *Single reason to change:* where files are stored | |

| **CertificatePdf** (module `certificate-pdf.ts`, `renderCertificatePdf()`) — Infrastructure | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Render the certificate PDF (`PREVIEW`, `TEST_SIGNED` or `OFFICIAL`) with QR code in KK/RU/EN | PDFKit, `qr-code.ts`, `certificate-texts.ts` |
| *Single reason to change:* the printed layout | |
