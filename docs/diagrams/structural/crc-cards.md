# CRC Cards (Class – Responsibility – Collaborator)

Each card names **one** reason to change (Single Responsibility Principle). Where a class could grow a second responsibility, that work has been moved to a collaborator; the *SRP note* says what was kept out. Class names match the code in `apps/api/src` and the [class diagram](class-diagram.md).

## Web client

| **RequestForm** (`apps/web/src/components/RequestForm.tsx`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Collect certificate type, purpose, language and details | `I18nProvider` (labels) |
| Validate required fields before submitting | `NewRequestPage` (receives the values) |
| *SRP note:* does not send HTTP requests; `NewRequestPage` submits through the `api` client and shows server errors via `useErrorMessage`. Workflow and eligibility are decided by the API | |

| **api client** (`apps/web/src/api/client.ts`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Send same-origin HTTP requests with the session cookie | Browser `fetch` |
| Add `X-CSRF-Token` to state-changing requests | `AuthProvider` (web, supplies the token) |
| Turn error responses into a typed `ApiError` | REST API |

## API — request pipeline

| **SessionGuard** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Resolve the `unidocs_sid` cookie into an `AuthContext` | `SessionService` |
| Return 401 for private routes without a valid session | `Reflector` (`@Public()` metadata) |

| **CsrfGuard** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Compare `X-CSRF-Token` with the session's token (constant-time) on non-GET requests | `AuthContext` |
| Return 403 on mismatch | |

| **RolesGuard** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Allow the call only if the user has one of the route's `@Roles()` | `Reflector`, `AuthContext` |
| *SRP note:* checks *role* only; *ownership* is checked in services | |

## API — domain services

| **RequestsService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Create a certificate request after eligibility and open-request checks | `StudentDataProvider` |
| List requests for a student, for staff queues and for admins | `PrismaService` |
| Apply an approval or rejection atomically and safely under concurrency | `WorkflowRules`, `WorkflowService` |
| Trigger document preparation after the final approval | `DocumentsService` |
| Record each change | `AuditService` |
| *SRP note:* the *rules* of who may decide live in `WorkflowRules`; PDF work lives in `DocumentsService` | |

| **WorkflowRules** (pure functions, `workflow-rules.ts`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Decide whether an actor may decide the current step (role, own request, separation of duties) | none (no I/O) |
| Compute the next status and step after an approval | |
| Validate an approval chain (1–6 steps, last = `AUTHORIZED_SIGNER`) | |

| **WorkflowService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Load the chain for a certificate type (override or default) | `PrismaService` |
| Replace a chain atomically after validation | `WorkflowRules`, `AuditService` |

| **DocumentsService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Manage the lifecycle of a document: prepare → sign → download → revoke | `PrismaService`, `StudentDataProvider` |
| Assign document numbers and verification tokens | `SigningProvider` |
| Answer public verification without personal data | `computeVerificationStatus` |
| | `StorageService`, `renderCertificatePdf`, `AuditService` |
| *SRP note:* PDF layout (`certificate-pdf.ts`), QR images (`qr-code.ts`), status rules (`verification.ts`), file I/O (`StorageService`) and cryptography (`SigningProvider`) are separate collaborators | |

| **renderCertificatePdf** (`documents/pdf/certificate-pdf.ts`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Lay out the certificate in KK / RU / EN with the QR code and signer block | `certificate-texts.ts`, `qr-code.ts`, PDFKit |
| Add the "TEST / NOT LEGALLY SIGNED" watermark in test mode | |

| **computeVerificationStatus** (`documents/verification.ts`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Map stored facts to `NOT_FOUND` / `REVOKED` / `EXPIRED` / `VALID` / `SIGNATURE_NOT_VERIFIED` in priority order | none (pure) |

| **AuthService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Map a verified external identity to a UniDocs user | `PrismaService` |
| Create a student account on first login if Platonus knows the student; deny unknown staff | `StudentDataProvider`, `AuditService` |

| **SessionService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Create sessions with a random token and CSRF token; store only the token hash | `PrismaService` |
| Resolve, destroy and expire sessions | `AppConfig` (TTL) |

| **AdminService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Provision staff accounts and change roles / active status | `PrismaService` |
| Prevent self-modification and staff roles on student accounts | `SessionService` (end sessions on deactivation) |
| Page through the audit log | `AuditService` |

| **AuditService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Append one audit entry, inside the caller's transaction when given | `PrismaService` / transaction client |
| *SRP note:* never reads or deletes entries; reading is `AdminService`'s job | |

| **StorageService** | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Save and read PDF files under `STORAGE_DIR` | Node `fs` |
| Refuse paths that escape the storage directory | `AppConfig` |

## API — integration boundaries (interfaces)

| **AuthProvider** «interface» (`MockAuthProvider`, `PlatonusSsoProvider`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Build the identity provider's login URL with `state` | Platonus SSO |
| Exchange the callback `code` for a verified identity | `AuthController` |

| **StudentDataProvider** «interface» (`MockStudentDataProvider`, `PlatonusStudentDataProvider`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Read a student's academic profile and education status, read-only | Platonus API |
| | `RequestsService`, `DocumentsService`, `AuthService` |

| **SigningProvider** «interface» (`MockSigningProvider`, `OfficialSigningProvider`) | |
| --- | --- |
| **Responsibilities** | **Collaborators** |
| Sign a PDF and report the signature status | NCALayer / NCA RK (official) |
| Verify an existing signature | `DocumentsService` |
