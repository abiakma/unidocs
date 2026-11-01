# Architecture

UniDocs is the AHEU (Almaty Humanitarian-Economic University) certificate management system. Students request official certificates online, staff approve and sign them, and anyone can check a certificate by scanning its QR code.

## Repository layout

```
apps/
  api/   NestJS 12 REST API (TypeScript, ESM), Prisma 7 + PostgreSQL
  web/   React 19 + Vite + Tailwind CSS 4 single-page app
docs/    This documentation
docker-compose.yml   Local PostgreSQL
.env.example         All configuration variables
```

The project keeps the stack required by `agents.md` (React + Vite + TypeScript on the frontend, Node.js REST API, PostgreSQL + Prisma). NestJS was chosen for the API because it gives DTO validation, guards and Swagger out of the box. There are no microservices.

## Runtime view

```mermaid
flowchart LR
  Browser -- "/ (SPA)" --> Web[Vite / static web app]
  Browser -- "/api (same origin)" --> API[NestJS API]
  API --> DB[(PostgreSQL)]
  API --> Files[(STORAGE_DIR: PDFs)]
  API -. "AuthProvider" .-> SSO[Platonus SSO\n(mock in dev)]
  API -. "StudentDataProvider" .-> PL[Platonus API\n(mock in dev)]
  API -. "SigningProvider" .-> EDS[NCALayer / NCA RK\n(mock in dev)]
```

The web app calls the API on the same origin (`/api`, proxied by Vite in development and by the reverse proxy in production), so the session cookie stays first-party.

## API modules (`apps/api/src`)

| Module | Responsibility |
| --- | --- |
| `config` | Loads and validates environment variables; refuses unsafe production settings |
| `auth` | Login/callback/logout, server-side sessions, `AuthProvider` (mock / Platonus SSO) |
| `students` | `StudentDataProvider` (mock / Platonus), `GET /students/me` |
| `requests` | Certificate requests and the staff approval endpoints |
| `workflow` | Pure approval rules (`workflow-rules.ts`) and configurable chains |
| `documents` | PDF + QR generation, signing, download, public verification |
| `signing` | `SigningProvider` (mock / official) |
| `admin` | Users, roles, workflow configuration, audit log, revocation |
| `audit` | Append-only audit log writer |
| `storage` | Safe file storage for generated PDFs |
| `common` | Guards (session → CSRF → roles), decorators, error filter |

Every request passes through four global guards in order: rate limiting, session, CSRF and roles. Ownership (a student sees only their own requests and documents) is checked in the services, and other people's records return **404** so IDs cannot be probed.

## Web app (`apps/web/src`)

| Folder | Content |
| --- | --- |
| `api/` | Typed API client (adds the CSRF header) and response types |
| `auth/` | Session context and route guard (UI only; the API enforces everything) |
| `i18n/` | `kk`, `ru`, `en` message files, kept separate from components |
| `components/` | Layout, status badges, workflow stepper, dialogs, toasts, skeletons |
| `pages/` | Home, login, mock login, student, staff, signer, admin, verification |

## Integration boundaries

The three external systems sit behind interfaces with a mock and an official implementation, chosen by environment variables:

| Variable | Interface | Development | Production |
| --- | --- | --- | --- |
| `AUTH_PROVIDER` | `AuthProvider` | `mock` | `platonus` |
| `STUDENT_DATA_PROVIDER` | `StudentDataProvider` | `mock` | `platonus` |
| `SIGNING_PROVIDER` | `SigningProvider` | `mock` | `official` |

With `NODE_ENV=production` the API **will not start** if any of them is `mock`, if `COOKIE_SECURE` is not `true`, or if `VERIFICATION_BASE_URL` is not HTTPS. The official implementations are deliberately unfinished until AHEU provides documentation: see [platonus-integration.md](platonus-integration.md), [authentication-flow.md](authentication-flow.md) and [digital-signature.md](digital-signature.md).

## Related documents

- [database-erd.md](database-erd.md) – schema and ER diagram
- [api-documentation.md](api-documentation.md) – endpoints
- [approval-workflow.md](approval-workflow.md) – statuses and approval chain
- [qr-verification.md](qr-verification.md) – tokens and the public page
- [deployment.md](deployment.md) – local setup and production checklist
